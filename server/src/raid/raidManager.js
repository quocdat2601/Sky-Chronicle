// ─────────────────────────────────────────────────────────────────────────────
// RAID MANAGER — GBF-accurate async model
//
// Each player has a fully INDEPENDENT turn loop against the shared boss HP.
// Pressing ATTACK resolves that player's turn immediately:
//   skills (instant) → ATTACK btn → player attacks + CA + CB → boss attacks player → turn ends
// No waiting for other players. Boss HP is the only shared state.
// Buffs/debuffs on boss are LOCAL per player (GBF-accurate).
// No time limit.
// ─────────────────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { BOSSES, CHARACTERS, WEAPONS, SUMMONS } from '../data/catalog.js';
import { calcGridStats, resolvePlayerAction, resolveBossAction, resolveBossOnEnter, tickAllEffects, checkPhaseTransition } from '../engine/combat.js';

const MAX_PLAYERS = 4;
// Rooms are purged after these TTLs to prevent unbounded memory growth
const ROOM_TTL_VICTORY_MS = 10 * 60 * 1000;  // 10 min after victory
const ROOM_TTL_WAITING_MS = 30 * 60 * 1000;  // 30 min idle in WAITING

const rooms = new Map();

// ── ROOM CLEANUP ──────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    const age = now - room.created_at;
    if (room.status === 'VICTORY' && age > ROOM_TTL_VICTORY_MS) {
      rooms.delete(id);
      console.log(`[Raid] Purged completed room ${id}`);
    } else if (room.status === 'WAITING' && age > ROOM_TTL_WAITING_MS) {
      rooms.delete(id);
      console.log(`[Raid] Purged stale waiting room ${id}`);
    }
  }
}, 5 * 60 * 1000); // runs every 5 minutes

// ── BUILD RUNTIME CHARACTER STATE ─────────────────────────────────────────────
function buildCharState(char_def) {
  return {
    id: char_def.id,
    name: char_def.name,
    element: char_def.element,
    type: char_def.type,
    base_atk: char_def.base_atk,
    hp: char_def.base_hp,
    hp_max: char_def.base_hp,
    charge_bar: 0,
    charge_gain_per_turn: char_def.charge_gain_per_turn,
    abilities: char_def.abilities,
    passive: char_def.passive,
    charge_attack: char_def.charge_attack,
    ability_cooldowns: {},
    status_effects: [],
    shield: 0,
  };
}

// ── BUILD MC CHARACTER STATE ──────────────────────────────────────────────────
function buildMCState(mc_config, main_weapon_element) {
  const element = main_weapon_element || mc_config.element || 'FIRE';
  // Combine preset skill + selected subskills into abilities array
  const abilities = [];
  if (mc_config.preset_skill) {
    abilities.push({
      id: 'MC_PRESET',
      name: mc_config.preset_skill.name,
      description: mc_config.preset_skill.description,
      cooldown_max: mc_config.preset_skill.cd || 7,
      effect_type: mc_config.preset_skill.effect_type || 'BUFF',
      target: 'ENEMY',
      value: { dmg_multiplier: 2.5 }, // basic fallback
    });
  }
  (mc_config.selected_skills || []).slice(0, 3).forEach((sk, i) => {
    if (!sk) return;
    abilities.push({
      id: `MC_SUB_${i}`,
      name: sk.name,
      description: sk.description,
      cooldown_max: sk.cd || 8,
      effect_type: sk.effect_type || 'BUFF',
      target: sk.effect_type === 'HEAL' ? 'ALL_ALLIES' : sk.effect_type === 'DAMAGE' ? 'ENEMY' : 'ALL_ALLIES',
      value: sk.effect_type === 'HEAL'   ? { heal_amount: 1500 }
           : sk.effect_type === 'DAMAGE' ? { dmg_multiplier: 2.0 }
           : { stat: 'ATK', amount: 0.20, duration: 3 },
    });
  });

  return {
    id: 'MC',
    name: 'Sky-Wanderer',
    element,
    type: mc_config.class_name || 'Fighter',
    base_atk: mc_config.base_atk || 1820,
    hp: mc_config.base_hp || 1820,
    hp_max: mc_config.base_hp || 1820,
    charge_bar: 0,
    charge_gain_per_turn: 20,
    abilities,
    passive: null,
    charge_attack: mc_config.charge_attack || { name: 'Raging Strike', description: 'Massive elemental DMG.' },
    ability_cooldowns: {},
    status_effects: [],
    shield: 0,
    is_mc: true,
  };
}


// ── BUILD RUNTIME BOSS STATE ──────────────────────────────────────────────────
// Each player gets their own local boss state (charge bar, debuffs, mode bar).
// Only boss_hp is shared across all players.
function buildBossLocalState(boss_def) {
  return {
    // charge_bar, status_effects, phase are all LOCAL per-player
    charge_bar: 0,
    current_phase_idx: 0,
    status_effects: [],
    atk_up_mod: 1.0,
    broken_turns: 0,
  };
}

function buildEntityDefs(boss_def) {
  return [boss_def, ...((boss_def.sub_entities || []).map(se => ({ ...se })))];
}

function cloneTriggers(entity_def) {
  return (entity_def.triggers || []).map(t => ({ ...t, fired: false }));
}

function cloneBossMeta(entity_def) {
  const meta = {};
  if (entity_def.passive_stacks) meta.passive_stacks = { ...entity_def.passive_stacks };
  if (entity_def.conditional_buffs) meta.conditional_buffs = entity_def.conditional_buffs.map(b => ({ ...b }));
  if (entity_def.countdown) meta.countdown = { ...entity_def.countdown };
  if (entity_def.damage_cap) meta.damage_cap = { ...entity_def.damage_cap };
  if (entity_def.field_on_join) meta.field_on_join = entity_def.field_on_join.map(e => ({ ...e }));
  meta.phase_entered = {};
  return meta;
}

function isLuciliusMain(entity_def) {
  return entity_def.id === 'BOSS003';
}

function applySubEntityOnDeath(room, entity_def, log) {
  const on_death = entity_def.on_death;
  if (!on_death) return;
  if (on_death.type === 'REMOVE_BOSS_BUFF' && on_death.target === 'BOSS003' && on_death.buff_name === 'Wings of the Word') {
    const meta = room.entity_meta?.BOSS003;
    if (meta?.damage_cap) meta.damage_cap.active = false;
    log?.push({ type: 'SYSTEM', msg: on_death.description || 'A boss buff was removed.' });
  }
}

// ── CREATE ROOM ───────────────────────────────────────────────────────────────
export function createRoom({ boss_id, creator_id, creator_name }) {
  const boss_def = BOSSES.find(b => b.id === boss_id);
  if (!boss_def) throw new Error(`Boss ${boss_id} not found`);

  const room_id = uuidv4().slice(0, 8).toUpperCase();
  const entity_defs = buildEntityDefs(boss_def);

  const room = {
    room_id,
    boss_def,
    entities: Object.fromEntries(entity_defs.map(def => [def.id, {
      id: def.id,
      name: def.name,
      element: def.element,
      hp: def.hp_max,
      hp_max: def.hp_max,
      def: def.def,
    }])),
    entity_defs: Object.fromEntries(entity_defs.map(def => [def.id, def])),
    entity_triggers: Object.fromEntries(entity_defs.map(def => [def.id, cloneTriggers(def)])),
    entity_meta: Object.fromEntries(entity_defs.map(def => [def.id, cloneBossMeta(def)])),
    dead_entities: {},
    players: [],
    status: 'WAITING', // WAITING | IN_PROGRESS | VICTORY
    combat_log: [],
    created_at: Date.now(),
  };

  rooms.set(room_id, room);
  console.log(`[Raid] Room ${room_id} created by ${creator_name}, boss: ${boss_def.name}`);
  return room_id;
}

// ── JOIN ROOM ─────────────────────────────────────────────────────────────────
export function joinRoom({ room_id, player_id, player_name, party_config, grid_config, mc_config, summon_config }) {
  const room = rooms.get(room_id);
  if (!room) return { error: 'Room not found' };
  if (room.status === 'VICTORY') return { error: 'Raid already completed' };

  const existing = room.players.find(p => p.player_id === player_id);
  if (existing) {
    existing.disconnected = false;
    return { ok: true, room_id, rejoin: true };
  }

  if (room.players.filter(p => !p.disconnected).length >= MAX_PLAYERS) {
    return { error: 'Room is full' };
  }

  const character_ids = party_config?.character_ids || ['C001', 'C002', 'C003'];
  const weapon_ids    = grid_config?.weapon_ids    || ['W001', 'W002', 'W003'];

  const characters = character_ids
    .map(id => CHARACTERS.find(c => c.id === id))
    .filter(Boolean)
    .map(buildCharState);

  // weapons declared BEFORE mc_element (which needs weapons[0])
  const weapons = weapon_ids
    .map(id => WEAPONS.find(w => w.id === id))
    .filter(Boolean);

  // Prepend MC as slot 0 if mc_config provided
  const mc_element = weapons[0]?.element || characters[0]?.element || 'FIRE';
  if (mc_config) {
    const mc_state = buildMCState(mc_config, mc_element);
    characters.unshift(mc_state);
  }

  const grid_stats = calcGridStats(weapons);

  // ── Summon auras ──────────────────────────────────────────────────────────
  // Main summon multiplies its bracket (omega_sum or normal_sum).
  // Sub summon stacks additively on top via its sub_aura_value.
  // Formula (wiki): omega_boost = 1 + omega_sum × (1 + omega_aura)
  //                 normal_boost = 1 + normal_sum × (1 + optimus_aura)
  const getAura = (summon_id, uncap, use_sub) => {
    if (!summon_id) return 0;
    const s = SUMMONS.find(s => s.id === summon_id);
    if (!s) return 0;
    const stars = Math.max(0, Math.min(5, uncap ?? s.uncap_stars ?? 3));
    return use_sub ? (s.sub_aura_value[stars] || 0) : (s.aura_value[stars] || 0);
  };

  const main_id    = summon_config?.main_id;
  const sub_id     = summon_config?.sub_id;
  const main_stars = summon_config?.main_stars ?? 3;
  const sub_stars  = summon_config?.sub_stars  ?? 3;
  const main_summon = SUMMONS.find(s => s.id === main_id);
  const sub_summon  = SUMMONS.find(s => s.id === sub_id);

  // Compute total omega_aura and optimus_aura (each sums main + sub contributions)
  let omega_aura   = 0;
  let optimus_aura = 0;
  if (main_summon?.aura_type === 'omega')   omega_aura   += getAura(main_id, main_stars, false);
  if (main_summon?.aura_type === 'optimus') optimus_aura += getAura(main_id, main_stars, false);
  if (sub_summon?.aura_type  === 'omega')   omega_aura   += getAura(sub_id,  sub_stars,  true);
  if (sub_summon?.aura_type  === 'optimus') optimus_aura += getAura(sub_id,  sub_stars,  true);

  // Attach auras to grid_stats so calcDamage can read them each hit
  grid_stats.omega_aura   = omega_aura;
  grid_stats.optimus_aura = optimus_aura;

  // Apply HP skill bonus to each character — per GBF wiki:
  //   effective_hp = (char.base_hp + grid_hp)
  //                × (1 + hp_aegis_sum
  //                     + normal_hp_sum × (1 + optimus_aura)
  //                     + omega_hp_sum  × (1 + omega_aura)
  //                     + ex_hp_sum)
  // Aegis (HP_BOOST) has no bracket → no aura multiplication
  // Majesty HP is in the same bracket as its ATK → same aura multiplier
  const gs = grid_stats;
  const total_hp_skill = (gs.hp_aegis_sum  || 0)
    + (gs.normal_hp_sum || 0) * (1 + optimus_aura)
    + (gs.omega_hp_sum  || 0) * (1 + omega_aura)
    + (gs.ex_hp_sum     || 0);

  const grid_hp = gs.grid_hp || 0;
  for (const char of characters) {
    char.hp_max = Math.floor((char.hp_max + grid_hp) * (1 + total_hp_skill));
    char.hp = char.hp_max;
  }

  // MC element applied during buildMCState above
  // Apply to first non-MC char if needed
  if (characters.find(ch => !ch.is_mc)) {
    const first_char = characters.find(ch => !ch.is_mc);
    if (first_char) first_char.element = first_char.element || mc_element;
  }

  const player_entry = {
    player_id,
    name: player_name,
    characters,
    weapons,
    grid_stats,
    summon_config: { main_id, sub_id, main_stars, sub_stars, omega_aura, optimus_aura },
    // Each player has their own local boss state
    local_boss: Object.fromEntries(Object.keys(room.entities).map(eid => [eid, buildBossLocalState(room.entity_defs[eid])])),
    main_boss_id: room.boss_def.id,
    target_id: room.boss_def.id,
    join_effect_applied: false,
    turn_number: 0,
    is_ready: false,
    honors: 0,
    disconnected: false,
    connected_at: Date.now(),
    // Skills used this pre-attack phase (logged, broadcast when ATTACK fires)
    pending_skill_log: [],
  };

  room.players.push(player_entry);
  console.log(`[Raid] ${player_name} joined room ${room_id} (${room.players.length}/${MAX_PLAYERS})`);
  return { ok: true, room_id, rejoin: false };
}

// ── SET READY ─────────────────────────────────────────────────────────────────
export function setPlayerReady(room_id, player_id) {
  const room = rooms.get(room_id);
  if (!room) return null;
  const player = room.players.find(p => p.player_id === player_id);
  if (player) player.is_ready = true;

  const alive = room.players.filter(p => !p.disconnected);
  let opening_log = null;
  if (alive.length > 0 && alive.every(p => p.is_ready)) {
    room.status = 'IN_PROGRESS';
    console.log(`[Raid] Room ${room_id} — RAID STARTED!`);
    if (room.boss_def.id === 'BOSS003' && !room.opening_done) {
      room.opening_done = true;
      opening_log = [];
      opening_log.push({ type: 'BOSS_CHARGE_ATTACK', source_id: 'BOSS003', ca_name: 'Paradise Lost', description: `${room.boss_def.name} unleashes Paradise Lost!` });
      for (const ps of alive) {
        for (const char of ps.characters) {
          if (char.hp <= 0) continue;
          const before = char.hp;
          const applied = 30000;
          char.hp = Math.max(0, char.hp - applied);
          const dealt = before - char.hp;
          opening_log.push({ type: 'BOSS_CA_HIT', source_id: 'BOSS003', target: char.name, damage: dealt, element: 'PLAIN' });
          if (before > 0 && char.hp <= 0) opening_log.push({ type: 'ALLY_KO', source_id: 'BOSS003', target: char.name });
        }
      }
    }
  }
  return { room, opening_log };
}

// ── USE SKILL (instant, pre-attack) ──────────────────────────────────────────
// Resolves immediately against player's local boss state.
// Returns log events to broadcast to all players.
export function useSkill(room_id, player_id, char_id, ability_id, target_id_arg = null) {
  const room = rooms.get(room_id);
  if (!room || room.status !== 'IN_PROGRESS') return { error: 'Raid not active' };

  const player = room.players.find(p => p.player_id === player_id);
  if (!player || player.disconnected) return { error: 'Player not in room' };

  const target_id = target_id_arg || player.target_id || room.boss_def.id;
  player.target_id = target_id;
  const boss_ctx = buildBossContext(room, player, target_id);

  const result = resolvePlayerAction({
    action: { type: 'USE_ABILITY', char_id, ability_id, target_id },
    player_state: player,
    boss_state: boss_ctx,
    grid_stats: player.grid_stats,
    weapons: player.weapons,
  });

  if (result.log.some(e => e.type === 'ERROR')) {
    return { error: result.log.find(e => e.type === 'ERROR').msg };
  }

  syncBossContext(room, player, boss_ctx);

  // Stash the log to include in the next ATTACK broadcast
  if (!player.pending_skill_log) player.pending_skill_log = [];
  player.pending_skill_log.push(...result.log);

  // Check victory from skill damage
  if (room.entities[room.boss_def.id].hp <= 0) {
    room.status = 'VICTORY';
    buildRewards(room);
  }

  return {
    ok: true,
    log: result.log,
    shared_boss_hp: room.entities[room.boss_def.id].hp,
    entity_hp: Object.fromEntries(Object.entries(room.entities).map(([id, e]) => [id, e.hp])),
    victory: room.status === 'VICTORY',
    rewards: room.rewards || null,
  };
}

// ── ATTACK (ends the turn for this player) ───────────────────────────────────
export function playerAttack(room_id, player_id, target_id_arg = null) {
  const room = rooms.get(room_id);
  if (!room || room.status !== 'IN_PROGRESS') return { error: 'Raid not active' };

  const player = room.players.find(p => p.player_id === player_id);
  if (!player || player.disconnected) return { error: 'Player not in room' };

  player.turn_number++;

  const target_id = target_id_arg || player.target_id || room.boss_def.id;
  player.target_id = target_id;
  const boss_ctx = buildBossContext(room, player, target_id);

  // Resolve normal attacks + CA + chain burst
  const result = resolvePlayerAction({
    action: { type: 'ATTACK', target_id },
    player_state: player,
    boss_state: boss_ctx,
    grid_stats: player.grid_stats,
    weapons: player.weapons,
  });

  // Write back local boss state
  syncBossContext(room, player, boss_ctx);

  const luci_meta2 = room.entity_meta?.BOSS003;
  if (luci_meta2?.conditional_buffs) {
    const dmg_by_elem = {};
    for (const ev of result.log) {
      if (!['NORMAL_ATTACK','CHARGE_ATTACK','ABILITY'].includes(ev.type)) continue;
      if (ev.target_id !== 'BOSS003') continue;
      const el = ev.element;
      if (!el) continue;
      dmg_by_elem[el] = (dmg_by_elem[el] || 0) + (ev.damage || 0);
    }
    const did_chain = result.log.some(ev => ev.type === 'CHAIN_BURST' && (ev.chain_count || 0) >= 4 && ev.target_id === 'BOSS003');
    let changed = false;
    luci_meta2.conditional_buffs = luci_meta2.conditional_buffs.map(b => {
      if (!b.active) return b;
      const cc = b.clear_condition;
      if (!cc) return b;
      if (cc.type === 'ELEMENT_DAMAGE_IN_TURN') {
        if ((dmg_by_elem[cc.element] || 0) >= (cc.threshold || 0)) { changed = true; return { ...b, active: false }; }
      }
      if (cc.type === 'CHAIN_BURST') {
        if (did_chain) { changed = true; return { ...b, active: false }; }
      }
      return b;
    });
    const non_final_active = luci_meta2.conditional_buffs.filter(b => b.id !== 'LABOR_FINAL' && b.active).length;
    luci_meta2.conditional_buffs = luci_meta2.conditional_buffs.map(b => {
      if (!b.active) return b;
      if (b.clear_condition?.type === 'ALL_OTHER_LABORS_CLEARED' && non_final_active === 0) { changed = true; return { ...b, active: false }; }
      return b;
    });
    if (changed) {
      if (!player.pending_skill_log) player.pending_skill_log = [];
      for (const b of luci_meta2.conditional_buffs) {
        if (!b.active) continue;
      }
      player.pending_skill_log.push({ type: 'SYSTEM', msg: 'A Labor condition was met.' });
    }
  }

  const meta = room.entity_meta?.BOSS003;
  if (meta?.damage_cap?.active && target_id === 'BOSS003') {
    const dealt = result.log.filter(e => ['NORMAL_ATTACK','CHARGE_ATTACK','CHAIN_BURST','ABILITY'].includes(e.type) && e.target_id === 'BOSS003').reduce((s, e) => s + (e.damage || e.cb_bonus || 0), 0);
    const luci_local = player.local_boss?.BOSS003;
    if (dealt > 0 && luci_local?.broken_turns > 0) {
      meta.damage_cap.active = false;
      if (!player.pending_skill_log) player.pending_skill_log = [];
      player.pending_skill_log.push({ type: 'SYSTEM', msg: 'Wings of the Word shatters!' });
    }
  }

  const target_def = room.entity_defs[target_id];
  if (target_def?.on_death && room.entities[target_id]?.hp <= 0 && !room.dead_entities[target_id]) {
    room.dead_entities[target_id] = true;
    applySubEntityOnDeath(room, target_def, player.pending_skill_log || (player.pending_skill_log = []));
  }

  // Check victory
  const victory = room.entities[room.boss_def.id].hp <= 0;
  if (victory) {
    room.status = 'VICTORY';
    buildRewards(room);
  }

  let boss_turn_log = [];
  if (!victory) {
    const entity_ids = Object.keys(room.entities);
    for (const eid of entity_ids) {
      if (room.entities[eid].hp <= 0) continue;
      const edef = room.entity_defs[eid];
      const ectx = buildBossContext(room, player, eid);
      const phase_before = ectx.current_phase_idx;
      const new_phase = checkPhaseTransition(edef, ectx);
      if (new_phase && ectx.current_phase_idx !== phase_before) {
        boss_turn_log.push({ type: 'PHASE_CHANGE', source_id: eid, phase: new_phase.phase, description: new_phase.on_enter?.description || `${edef.name} enters Phase ${new_phase.phase}!` });
        const meta2 = room.entity_meta?.[eid];
        if (new_phase.on_enter && !meta2?.phase_entered?.[new_phase.phase]) {
          if (meta2?.phase_entered) meta2.phase_entered[new_phase.phase] = true;
          const oe = resolveBossOnEnter({ boss_def: edef, boss_state: ectx, on_enter: new_phase.on_enter, all_player_states: [player] });
          boss_turn_log.push(...oe.log);
        }
      }
      const boss_result = resolveBossAction({ boss_def: edef, boss_state: ectx, all_player_states: [player] });
      boss_turn_log.push(...boss_result.log);
      syncBossContext(room, player, ectx);
    }

    // Tick status effects for this player
    const tick_log = tickAllEffects([player], buildBossContext(room, player, room.boss_def.id));
    boss_turn_log.push(...tick_log);

    // Decrement ability cooldowns (only on ATTACK turn end, not on skill use)
    for (const char of player.characters) {
      if (char.ability_cooldowns) {
        for (const key of Object.keys(char.ability_cooldowns)) {
          if (char.ability_cooldowns[key] > 0) char.ability_cooldowns[key]--;
        }
      }
    }

    const luci_meta = room.entity_meta?.BOSS003;
    if (luci_meta?.countdown && Array.isArray(boss_turn_log)) {
      const kos = boss_turn_log.filter(e => e.type === 'ALLY_KO').length;
      if (kos > 0) {
        luci_meta.countdown.current = Math.max(0, (luci_meta.countdown.current ?? 0) - kos);
        boss_turn_log.push({ type: 'COUNTDOWN', name: luci_meta.countdown.name, current: luci_meta.countdown.current });
        if (luci_meta.countdown.current <= 0) {
          room.status = 'DEFEAT';
          for (const p of room.players) for (const c of p.characters) c.hp = 0;
        }
      }
    }
  }

  // Collect honors
  const all_log = [...(player.pending_skill_log || []), ...result.log, ...boss_turn_log];
  const dmg_events = all_log.filter(e => ['NORMAL_ATTACK','CHARGE_ATTACK','CHAIN_BURST','ABILITY'].includes(e.type));
  player.honors += dmg_events.reduce((s, e) => s + (e.damage || e.cb_bonus || 0), 0);
  player.pending_skill_log = [];

  // Check defeat for this player
  const player_defeated = player.characters.every(c => c.hp <= 0);

  return {
    ok: true,
    turn_number: player.turn_number,
    attack_log: result.log,
    boss_log: boss_turn_log,
    shared_boss_hp: room.entities[room.boss_def.id].hp,
    entity_hp: Object.fromEntries(Object.entries(room.entities).map(([id, e]) => [id, e.hp])),
    victory: room.status === 'VICTORY',
    defeat: room.status === 'DEFEAT',
    player_defeated,
    rewards: room.rewards || null,
  };
}

// ── BOSS CONTEXT HELPERS ──────────────────────────────────────────────────────
// Combines shared HP with player's local boss state for the combat engine
function buildBossContext(room, player) {
  const entity_id = arguments[2] || room.boss_def.id;
  const ent = room.entities[entity_id];
  const def = room.entity_defs[entity_id] || room.boss_def;
  const local = player.local_boss?.[entity_id] || buildBossLocalState(def);
  const meta = room.entity_meta?.[entity_id] || {};
  const damage_cap_active = isLuciliusMain(def) ? !!meta.damage_cap?.active : false;

  return {
    id: def.id,
    name: def.name,
    element: def.element,
    hp: ent?.hp ?? def.hp_max,
    hp_max: ent?.hp_max ?? def.hp_max,
    def: def.def,
    charge_bar: local.charge_bar,
    current_phase_idx: local.current_phase_idx,
    status_effects: local.status_effects,
    atk_up_mod: local.atk_up_mod,
    broken_turns: local.broken_turns || 0,
    triggers: room.entity_triggers?.[entity_id] || [],
    conditional_buffs: meta.conditional_buffs || null,
    passive_stacks: meta.passive_stacks || null,
    countdown: meta.countdown || null,
    damage_cap: damage_cap_active ? { active: true, per_turn_cap: meta.damage_cap?.per_turn_cap } : { active: false, per_turn_cap: null },
  };
}

function syncBossContext(room, player, boss_ctx) {
  if (!room.entities[boss_ctx.id]) return;
  room.entities[boss_ctx.id].hp = boss_ctx.hp;
  if (room.entity_triggers?.[boss_ctx.id]) room.entity_triggers[boss_ctx.id] = boss_ctx.triggers || room.entity_triggers[boss_ctx.id];
  if (boss_ctx.conditional_buffs && room.entity_meta?.[boss_ctx.id]) room.entity_meta[boss_ctx.id].conditional_buffs = boss_ctx.conditional_buffs;
  if (boss_ctx.passive_stacks && room.entity_meta?.[boss_ctx.id]) room.entity_meta[boss_ctx.id].passive_stacks = boss_ctx.passive_stacks;
  if (boss_ctx.countdown && room.entity_meta?.[boss_ctx.id]) room.entity_meta[boss_ctx.id].countdown = boss_ctx.countdown;
  if (boss_ctx.damage_cap && room.entity_meta?.[boss_ctx.id]?.damage_cap) room.entity_meta[boss_ctx.id].damage_cap.active = boss_ctx.damage_cap.active;

  if (!player.local_boss) player.local_boss = {};
  if (!player.local_boss[boss_ctx.id]) player.local_boss[boss_ctx.id] = buildBossLocalState(room.entity_defs[boss_ctx.id]);
  player.local_boss[boss_ctx.id].charge_bar = boss_ctx.charge_bar;
  player.local_boss[boss_ctx.id].current_phase_idx = boss_ctx.current_phase_idx;
  player.local_boss[boss_ctx.id].status_effects = boss_ctx.status_effects;
  player.local_boss[boss_ctx.id].atk_up_mod = boss_ctx.atk_up_mod;
  player.local_boss[boss_ctx.id].broken_turns = boss_ctx.broken_turns || 0;
}

// ── REWARDS ───────────────────────────────────────────────────────────────────
function buildRewards(room) {
  room.rewards = {
    exp: 5000,
    items: ['W002', 'W004'],
    honor_ranking: room.players
      .filter(p => !p.disconnected)
      .sort((a, b) => b.honors - a.honors)
      .map((p, i) => ({ rank: i + 1, player_id: p.player_id, name: p.name, honors: p.honors })),
  };
}

// ── DISCONNECT ────────────────────────────────────────────────────────────────
export function disconnectPlayer(room_id, player_id) {
  const room = rooms.get(room_id);
  if (!room) return;
  const player = room.players.find(p => p.player_id === player_id);
  if (!player) return;
  player.disconnected = true;
  console.log(`[Raid] Player ${player.name} disconnected from ${room_id}`);
}

// ── SNAPSHOTS ─────────────────────────────────────────────────────────────────
export function getRoomSnapshot(room_id) {
  const room = rooms.get(room_id);
  if (!room) return null;
  return {
    room_id: room.room_id,
    status: room.status,
    boss: {
      id: room.boss_def.id,
      name: room.boss_def.name,
      element: room.boss_def.element,
      hp: room.entities[room.boss_def.id].hp,
      hp_max: room.entities[room.boss_def.id].hp_max,
    },
    sub_entities: Object.values(room.entities)
      .filter(e => e.id !== room.boss_def.id)
      .map(e => ({ id: e.id, name: e.name, element: e.element, hp: e.hp, hp_max: e.hp_max })),
    players: room.players.map(p => getPlayerSnapshot(p)),
    rewards: room.rewards || null,
  };
}

export function getPlayerSnapshot(player) {
  const main_id = player.main_boss_id || 'BOSS001';
  return {
    player_id: player.player_id,
    name: player.name,
    is_ready: player.is_ready,
    disconnected: player.disconnected,
    honors: player.honors,
    turn_number: player.turn_number,
    target_id: player.target_id || main_id,
    local_boss: {
      charge_bar: player.local_boss?.[main_id]?.charge_bar ?? 0,
      current_phase: (player.local_boss?.[main_id]?.current_phase_idx ?? 0) + 1,
      status_effects: player.local_boss?.[main_id]?.status_effects ?? [],
    },
    local_sub_entities: Object.entries(player.local_boss || {})
      .filter(([id]) => id !== main_id)
      .map(([id, s]) => ({
        id,
        charge_bar: s.charge_bar ?? 0,
        current_phase: (s.current_phase_idx ?? 0) + 1,
        status_effects: s.status_effects ?? [],
      })),
    characters: player.characters.map(c => ({
      id: c.id,
      name: c.name,
      element: c.element,
      base_atk: c.base_atk,
      type: c.type,
      hp: c.hp,
      hp_max: c.hp_max,
      charge_bar: c.charge_bar,
      status_effects: c.status_effects,
      ability_cooldowns: c.ability_cooldowns,
      abilities: (c.abilities || []).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        cooldown_max: a.cooldown_max,
        effect_type: a.effect_type,
      })),
      is_mc: c.is_mc || false,
    })),
    grid_stats: player.grid_stats,
    summon_config: player.summon_config
      ? { ...player.summon_config, summon_call_used: player.summon_call_used || false }
      : null,
  };
}

// ── USE SUMMON (active call) ──────────────────────────────────────────────────
export function useSummon(room_id, player_id) {
  const room = rooms.get(room_id);
  if (!room || room.status !== 'IN_PROGRESS') return { error: 'Raid not active' };
  const player = room.players.find(p => p.player_id === player_id);
  if (!player || player.disconnected) return { error: 'Player not in room' };
  if (player.summon_call_used) return { error: 'Summon already used this battle' };

  const main_id = player.summon_config?.main_id;
  const summon  = SUMMONS.find(s => s.id === main_id);
  if (!summon) return { error: 'No main summon equipped' };

  player.summon_call_used = true;
  const log = [];
  const boss_ctx = buildBossContext(room, player);

  // Summon call damage
  // dmg_type 'massive' = ignores DEF (wiki confirmed — "Massive/Big/Medium quantifier calls ignore DEF")
  // dmg_type 'skill'   = based on MC skill specs (uses grid multipliers)
  // dmg_type 'none'    = no damage (pure support, e.g. Yggdrasil)
  const mc = player.characters[0];
  const gs = player.grid_stats || {};

  if (summon.call.dmg_type === 'massive') {
    // Massive calls ignore DEF — base on MC ATK × call_mult, no DEF division
    const mc_atk = (mc ? mc.base_atk : 1890) + (gs.grid_atk || 0);
    const call_dmg = Math.round(mc_atk * (gs.normal_mult || 1) * (gs.omega_mult || 1) * (gs.ex_mult || 1) * 2.0);
    boss_ctx.hp = Math.max(0, boss_ctx.hp - call_dmg);
    room.shared_boss_hp = Math.max(0, room.shared_boss_hp - call_dmg);
    log.push({ type: 'SUMMON_CALL', summon_name: summon.name, call_name: summon.call.name, call_dmg });
  } else if (summon.call.dmg_type === 'skill') {
    const mc_atk = (mc ? mc.base_atk : 1890) + (gs.grid_atk || 0);
    const raw = mc_atk * (gs.normal_mult || 1) * (gs.omega_mult || 1) * (gs.ex_mult || 1) * 6.0 / Math.max(1, boss_ctx.def);
    const call_dmg = Math.round(raw);
    boss_ctx.hp = Math.max(0, boss_ctx.hp - call_dmg);
    room.shared_boss_hp = Math.max(0, room.shared_boss_hp - call_dmg);
    log.push({ type: 'SUMMON_CALL', summon_name: summon.name, call_name: summon.call.name, call_dmg });
  } else {
    // No damage — pure support call (e.g. Yggdrasil)
    log.push({ type: 'SUMMON_CALL', summon_name: summon.name, call_name: summon.call.name, call_dmg: 0 });
  }

  // Apply primary effect
  if (summon.call.effect) {
    const { type, amount, duration, target } = summon.call.effect;
    if (target === 'foe') {
      applyStatusEffect(boss_ctx, { type, amount, duration });
      log.push({ type: 'DEBUFF_APPLIED', effect: summon.call.effect, target: 'boss' });
    } else {
      applyStatusEffect(player, { type, amount, duration, target_id: 'party' });
      log.push({ type: 'BUFF_APPLIED', effect: summon.call.effect, target: 'party' });
    }
  }

  // Apply secondary effect (e.g. Yggdrasil regen)
  if (summon.call.effect2) {
    const { type, heal, duration, target } = summon.call.effect2;
    if (target === 'party') {
      // Apply regen to all characters
      for (const char of player.characters) {
        if (char.hp > 0) {
          applyStatusEffect(char, { type, heal, duration });
        }
      }
      log.push({ type: 'BUFF_APPLIED', effect: summon.call.effect2, target: 'party' });
    }
  }

  syncBossContext(room, player, boss_ctx);
  if (room.shared_boss_hp <= 0) {
    room.status = 'VICTORY';
    buildRewards(room);
  }

  return {
    ok: true,
    log,
    shared_boss_hp: room.shared_boss_hp,
    victory: room.status === 'VICTORY',
    rewards: room.rewards || null,
  };
}

export function getAllRooms() {
  return [...rooms.values()].map(r => ({
    room_id: r.room_id,
    boss_name: r.boss_def.name,
    boss_element: r.boss_def.element,
    player_count: r.players.filter(p => !p.disconnected).length,
    status: r.status,
    created_at: r.created_at,
  }));
}

export function getRoom(room_id) {
  return rooms.get(room_id);
}
