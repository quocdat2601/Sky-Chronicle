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
import { BOSSES, CHARACTERS, WEAPONS } from '../data/catalog.js';
import { calcGridStats, resolvePlayerAction, resolveBossAction, tickAllEffects, checkPhaseTransition } from '../engine/combat.js';

const MAX_PLAYERS = 4;

const rooms = new Map();

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
    // triggers are per-player too (fired independently)
    triggers: boss_def.triggers.map(t => ({ ...t, fired: false })),
  };
}

// ── CREATE ROOM ───────────────────────────────────────────────────────────────
export function createRoom({ boss_id, creator_id, creator_name }) {
  const boss_def = BOSSES.find(b => b.id === boss_id);
  if (!boss_def) throw new Error(`Boss ${boss_id} not found`);

  const room_id = uuidv4().slice(0, 8).toUpperCase();

  const room = {
    room_id,
    boss_def,
    // Shared boss HP pool — all players damage this
    shared_boss_hp: boss_def.hp_max,
    shared_boss_hp_max: boss_def.hp_max,
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
export function joinRoom({ room_id, player_id, player_name, party_config, grid_config }) {
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

  const weapons = weapon_ids
    .map(id => WEAPONS.find(w => w.id === id))
    .filter(Boolean);

  const grid_stats = calcGridStats(weapons);

  // Apply HP_BOOST
  const hp_boost_sum = weapons.reduce((sum, w) => {
    return sum + (w.skills || []).reduce((s, sk) => {
      if (sk.skill_type !== 'HP_BOOST') return s;
      return s + (sk.magnitude_base + (sk.skill_level - 1) * sk.magnitude_per_level);
    }, 0);
  }, 0);
  if (hp_boost_sum > 0) {
    for (const char of characters) {
      const bonus = Math.floor(char.hp_max * hp_boost_sum);
      char.hp_max += bonus;
      char.hp = char.hp_max;
    }
  }

  // MC element from main weapon
  const mc_element = weapons[0]?.element || characters[0]?.element || 'FIRE';
  if (characters[0]) characters[0].element = mc_element;

  const player_entry = {
    player_id,
    name: player_name,
    characters,
    weapons,
    grid_stats,
    // Each player has their own local boss state
    local_boss: buildBossLocalState(room.boss_def),
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
  if (alive.length > 0 && alive.every(p => p.is_ready)) {
    room.status = 'IN_PROGRESS';
    console.log(`[Raid] Room ${room_id} — RAID STARTED!`);
  }
  return room;
}

// ── USE SKILL (instant, pre-attack) ──────────────────────────────────────────
// Resolves immediately against player's local boss state.
// Returns log events to broadcast to all players.
export function useSkill(room_id, player_id, char_id, ability_id) {
  const room = rooms.get(room_id);
  if (!room || room.status !== 'IN_PROGRESS') return { error: 'Raid not active' };

  const player = room.players.find(p => p.player_id === player_id);
  if (!player || player.disconnected) return { error: 'Player not in room' };

  // Build a temporary boss object for combat engine (local boss state + shared HP)
  const boss_ctx = buildBossContext(room, player);

  const result = resolvePlayerAction({
    action: { type: 'USE_ABILITY', char_id, ability_id },
    player_state: player,
    boss_state: boss_ctx,
    grid_stats: player.grid_stats,
    weapons: player.weapons,
  });

  if (result.log.some(e => e.type === 'ERROR')) {
    return { error: result.log.find(e => e.type === 'ERROR').msg };
  }

  // Write back local boss state changes (debuffs, charge bar changes from delay)
  syncBossContext(room, player, boss_ctx);

  // Damage from skills goes to shared HP
  const skill_dmg = result.log
    .filter(e => e.type === 'ABILITY' && e.damage)
    .reduce((s, e) => s + e.damage, 0);
  if (skill_dmg > 0) {
    room.shared_boss_hp = Math.max(0, room.shared_boss_hp - skill_dmg);
  }

  // Stash the log to include in the next ATTACK broadcast
  if (!player.pending_skill_log) player.pending_skill_log = [];
  player.pending_skill_log.push(...result.log);

  // Check victory from skill damage
  if (room.shared_boss_hp <= 0) {
    room.status = 'VICTORY';
    buildRewards(room);
  }

  return {
    ok: true,
    log: result.log,
    shared_boss_hp: room.shared_boss_hp,
    victory: room.status === 'VICTORY',
    rewards: room.rewards || null,
  };
}

// ── ATTACK (ends the turn for this player) ───────────────────────────────────
export function playerAttack(room_id, player_id) {
  const room = rooms.get(room_id);
  if (!room || room.status !== 'IN_PROGRESS') return { error: 'Raid not active' };

  const player = room.players.find(p => p.player_id === player_id);
  if (!player || player.disconnected) return { error: 'Player not in room' };

  player.turn_number++;

  const boss_ctx = buildBossContext(room, player);

  // Resolve normal attacks + CA + chain burst
  const result = resolvePlayerAction({
    action: { type: 'ATTACK' },
    player_state: player,
    boss_state: boss_ctx,
    grid_stats: player.grid_stats,
    weapons: player.weapons,
  });

  // Damage to shared HP
  const atk_dmg = result.log
    .filter(e => ['NORMAL_ATTACK','CHARGE_ATTACK','CHAIN_BURST'].includes(e.type))
    .reduce((s, e) => s + (e.damage || e.cb_bonus || 0), 0);
  room.shared_boss_hp = Math.max(0, room.shared_boss_hp - atk_dmg);

  // Write back local boss state
  syncBossContext(room, player, boss_ctx);

  // Check victory
  const victory = room.shared_boss_hp <= 0;
  if (victory) {
    room.status = 'VICTORY';
    buildRewards(room);
  }

  let boss_turn_log = [];
  if (!victory) {
    // Boss attacks this player locally
    const boss_result = resolveBossAction({
      boss_def: room.boss_def,
      boss_state: boss_ctx,
      all_player_states: [player],
    });
    boss_turn_log = boss_result.log;
    syncBossContext(room, player, boss_ctx);

    // Tick status effects for this player
    const tick_log = tickAllEffects([player], boss_ctx);
    boss_turn_log.push(...tick_log);

    // Decrement ability cooldowns (only on ATTACK turn end, not on skill use)
    for (const char of player.characters) {
      if (char.ability_cooldowns) {
        for (const key of Object.keys(char.ability_cooldowns)) {
          if (char.ability_cooldowns[key] > 0) char.ability_cooldowns[key]--;
        }
      }
    }

    // Check phase transition for this player's local view
    const new_phase = checkPhaseTransition(room.boss_def, boss_ctx);
    if (new_phase) {
      boss_turn_log.push({ type: 'PHASE_CHANGE', phase: new_phase.phase, description: new_phase.on_enter?.description || `Boss enters Phase ${new_phase.phase}!` });
      player.local_boss.current_phase_idx = boss_ctx.current_phase_idx;
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
    shared_boss_hp: room.shared_boss_hp,
    victory,
    player_defeated,
    rewards: room.rewards || null,
  };
}

// ── BOSS CONTEXT HELPERS ──────────────────────────────────────────────────────
// Combines shared HP with player's local boss state for the combat engine
function buildBossContext(room, player) {
  return {
    id: room.boss_def.id,
    name: room.boss_def.name,
    element: room.boss_def.element,
    hp: room.shared_boss_hp,
    hp_max: room.shared_boss_hp_max,
    def: room.boss_def.def,
    charge_bar: player.local_boss.charge_bar,
    current_phase_idx: player.local_boss.current_phase_idx,
    status_effects: player.local_boss.status_effects,
    atk_up_mod: player.local_boss.atk_up_mod,
    triggers: player.local_boss.triggers,
  };
}

function syncBossContext(room, player, boss_ctx) {
  // Shared: only HP
  room.shared_boss_hp = boss_ctx.hp;
  // Local: everything else
  player.local_boss.charge_bar = boss_ctx.charge_bar;
  player.local_boss.current_phase_idx = boss_ctx.current_phase_idx;
  player.local_boss.status_effects = boss_ctx.status_effects;
  player.local_boss.atk_up_mod = boss_ctx.atk_up_mod;
  player.local_boss.triggers = boss_ctx.triggers;
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
      hp: room.shared_boss_hp,
      hp_max: room.shared_boss_hp_max,
    },
    players: room.players.map(p => getPlayerSnapshot(p)),
    rewards: room.rewards || null,
  };
}

export function getPlayerSnapshot(player) {
  return {
    player_id: player.player_id,
    name: player.name,
    is_ready: player.is_ready,
    disconnected: player.disconnected,
    honors: player.honors,
    turn_number: player.turn_number,
    local_boss: {
      charge_bar: player.local_boss.charge_bar,
      current_phase: player.local_boss.current_phase_idx + 1,
      status_effects: player.local_boss.status_effects,
    },
    characters: player.characters.map(c => ({
      id: c.id,
      name: c.name,
      element: c.element,
      hp: c.hp,
      hp_max: c.hp_max,
      charge_bar: c.charge_bar,
      status_effects: c.status_effects,
      ability_cooldowns: c.ability_cooldowns,
    })),
    grid_stats: player.grid_stats,
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
