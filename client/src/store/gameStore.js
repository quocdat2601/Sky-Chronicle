import { create } from 'zustand';
import { io } from 'socket.io-client';
import { animationBus } from '../systems/animation/animationBus.js';
import { GBF_MOTION, GBF_TIMING_MS } from '../systems/animation/animationTimings.js';

const API = '/api';
let socket = null;

// MC (Sky-Wanderer) base stats — Fighter class at level 1
// These mirror the GBF Fighter class baseline used in Estimated Damage calculations
const MC_BASE_ATK = 1890;
const MC_BASE_HP  = 3060;

const ts = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

export const useGameStore = create((set, get) => ({
  // ── Identity ────────────────────────────────────────────────────────────────
  player_id: (() => {
    let id = localStorage.getItem('sky_player_id');
    if (!id) { id = 'P_' + Math.random().toString(36).slice(2, 10).toUpperCase(); localStorage.setItem('sky_player_id', id); }
    return id;
  })(),
  player_name: localStorage.getItem('sky_player_name') || '',
  setPlayerName: (name) => { localStorage.setItem('sky_player_name', name); set({ player_name: name }); },

  // ── Routing ─────────────────────────────────────────────────────────────────
  screen: 'lobby',
  setScreen: (s) => set({ screen: s }),

  // ── Catalog ─────────────────────────────────────────────────────────────────
  catalog_characters: [],
  catalog_weapons: [],
  catalog_bosses: [],
  catalog_mc_classes: [],
  mc_class_id: 'MC_FIGHTER',
  setMcClass: (id) => set({ mc_class_id: id, mc_selected_skills: [] }),
  mc_selected_skills: [], // up to 3 subskill names selected from current class
  setMcSelectedSkills: (skills) => set({ mc_selected_skills: skills }),
  catalog_summons: [],
  loadCatalog: async () => {
    try {
      const fetchJson = async (path) => {
        const r = await fetch(`${API}${path}`);
        if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
        return await r.json();
      };
      const [chars, weaps, bosses, mc_classes, summons] = await Promise.all([
        fetchJson('/catalog/characters'),
        fetchJson('/catalog/weapons'),
        fetchJson('/catalog/bosses'),
        fetchJson('/catalog/mc-classes'),
        fetchJson('/catalog/summons'),
      ]);
      set({
        catalog_characters: chars,
        catalog_weapons: weaps,
        catalog_bosses: bosses,
        catalog_mc_classes: mc_classes,
        catalog_summons: summons,
      });
    } catch (e) {
      console.error('[Catalog]', e);
    }
  },

  // ── Summon selection ──────────────────────────────────────────────────────────
  main_summon_id:    null,   // S001–S012
  main_summon_stars: 3,
  sub_summon_id:     null,
  sub_summon_stars:  3,
  setMainSummon: (id, stars = 3) => set({ main_summon_id: id, main_summon_stars: stars }),
  setSubSummon:  (id, stars = 3) => set({ sub_summon_id: id,  sub_summon_stars:  stars }),

  // ── Party / Grid ─────────────────────────────────────────────────────────────
  party_character_ids: ['C001', 'C002', 'C003'],
  setPartyCharacters: (ids) => set({ party_character_ids: ids }),

  grid_weapon_ids: Array(10).fill(null),
  setGridWeapon: (slot, id) => {
    const g = [...get().grid_weapon_ids]; g[slot] = id; set({ grid_weapon_ids: g });
  },
  clearGridSlot: (slot) => {
    const g = [...get().grid_weapon_ids]; g[slot] = null; set({ grid_weapon_ids: g });
  },
  grid_stats: null,
  calculateGridStats: async () => {
    const ids = get().grid_weapon_ids.filter(Boolean);
    if (!ids.length) { set({ grid_stats: null }); return; }

    const stats = await fetch(`${API}/grid/calculate`, {
      method: 'POST', body: JSON.stringify({ weapon_ids: ids }),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());

    // ── Summon auras ────────────────────────────────────────────────────────
    // Compute omega_aura and optimus_aura from currently selected summons.
    // Formula (wiki): omega_boost  = 1 + omega_sum  × (1 + omega_aura)
    //                 normal_boost = 1 + normal_sum × (1 + optimus_aura)
    const { catalog_summons,
            main_summon_id, main_summon_stars,
            sub_summon_id,  sub_summon_stars } = get();

    const getSummon = id => catalog_summons?.find(s => s.id === id);
    const getAuraVal = (id, stars, use_sub) => {
      const s = getSummon(id);
      if (!s) return 0;
      const idx = Math.max(0, Math.min(5, stars ?? s.uncap_stars ?? 3));
      return use_sub ? (s.sub_aura_value?.[idx] || 0) : (s.aura_value?.[idx] || 0);
    };

    const main_def = getSummon(main_summon_id);
    const sub_def  = getSummon(sub_summon_id);

    let omega_aura   = 0;
    let optimus_aura = 0;
    if (main_def?.aura_type === 'omega')   omega_aura   += getAuraVal(main_summon_id, main_summon_stars, false);
    if (main_def?.aura_type === 'optimus') optimus_aura += getAuraVal(main_summon_id, main_summon_stars, false);
    if (sub_def?.aura_type  === 'omega')   omega_aura   += getAuraVal(sub_summon_id,  sub_summon_stars,  true);
    if (sub_def?.aura_type  === 'optimus') optimus_aura += getAuraVal(sub_summon_id,  sub_summon_stars,  true);

    // ── Aura-boosted bracket multipliers ────────────────────────────────────
    // Wiki formula: Omega boost  = 1 + omega_sum  × (1 + omega_aura)
    //               Normal boost = 1 + normal_sum × (1 + optimus_aura)
    //               EX boost     = 1 + ex_sum   (no summon aura on EX)
    // Display: show (multiplier - 1) × 100 as boost % (e.g. 1.77 → 77%)
    // The summon aura addend (e.g. 1.50 for double Colossus 3★) is stored separately
    const normal_boost = 1 + (stats.normal_sum || 0) * (1 + optimus_aura);
    const omega_boost  = 1 + (stats.omega_sum  || 0) * (1 + omega_aura);
    const ex_boost     = 1 + (stats.ex_sum     || 0); // EX has no summon aura

    const enriched_stats = {
      ...stats,
      // ── Summon aura addends ───────────────────────────────────────────────
      optimus_aura,          // raw addend, e.g. 1.20 for Agni 3★
      omega_aura,            // raw addend, e.g. 1.00 for Colossus 3★ main only
      // ── Summon aura % for bracket header display ──────────────────────────
      // Header shows the summon's own aura %, e.g. 100% for Colossus 3★ main
      optimus_aura_pct: optimus_aura * 100,
      omega_aura_pct:   omega_aura   * 100,
      // ── Aura-boosted skill values for skill pills ─────────────────────────
      // wiki: each skill in Normal bracket is multiplied by (1 + optimus_aura)
      //       each skill in Omega bracket is multiplied by (1 + omega_aura)
      //       EX bracket skills are NOT boosted by any summon aura
      // "Might" pill: normal_sum × (1 + optimus_aura) × 100
      // "Ω Might" pill: omega_sum × (1 + omega_aura) × 100
      might_pct:          ((stats.normal_sum || 0) * (1 + optimus_aura)) * 100,
      omega_might_pct:    ((stats.omega_sum  || 0) * (1 + omega_aura))   * 100,
      ex_might_pct:       ((stats.ex_sum     || 0))                       * 100,
      stamina_normal_pct: ((stats.normal_stam || 0) * (1 + optimus_aura)) * 100,
      stamina_omega_pct:  ((stats.omega_stam  || 0) * (1 + omega_aura))   * 100,
      stamina_ex_pct:     ((stats.ex_stam     || 0))                       * 100,
      enmity_normal_pct:  ((stats.normal_enm  || 0) * (1 + optimus_aura)) * 100,
      enmity_omega_pct:   ((stats.omega_enm   || 0) * (1 + omega_aura))   * 100,
      enmity_ex_pct:      ((stats.ex_enm      || 0))                       * 100,
      // HP skill: Aegis (no aura) + Majesty per bracket (with aura)
      // Matches raidManager HP formula exactly
      hp_skill_pct: (
          (stats.hp_aegis_sum  || 0)
        + (stats.normal_hp_sum || 0) * (1 + optimus_aura)
        + (stats.omega_hp_sum  || 0) * (1 + omega_aura)
        + (stats.ex_hp_sum     || 0)
      ) * 100,
      dmg_cap_na:         (stats.na_cap_bonus  || 0) * 100,
      dmg_cap_ca:         (stats.ca_cap_bonus  || 0) * 100,
      supplemental:       stats.supp_flat    || 0,
      mc_max_hp: Math.floor((MC_BASE_HP + (stats.grid_hp || 0)) * (1 + (
          (stats.hp_aegis_sum  || 0)
        + (stats.normal_hp_sum || 0) * (1 + optimus_aura)
        + (stats.omega_hp_sum  || 0) * (1 + omega_aura)
        + (stats.ex_hp_sum     || 0)
      ))),
      estimated_dmg: Math.round((MC_BASE_ATK + (stats.grid_atk || 0)) * normal_boost * omega_boost * ex_boost),
    };

    set({ grid_stats: enriched_stats });
  },

  // ── Raids lobby ──────────────────────────────────────────────────────────────
  raids_list: [],
  loadRaids: async () => { const r = await fetch(`${API}/raids`).then(r => r.json()); set({ raids_list: r }); },
  createRaid: async (boss_id) => {
    const { player_id, player_name } = get();
    const r = await fetch(`${API}/raids`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boss_id, player_id, player_name }),
    }).then(r => r.json());
    return r.room_id;
  },

  // ── Battle state ──────────────────────────────────────────────────────────────
  current_room_id: null,
  raid_state: null,          // full room snapshot (boss HP, all players)
  my_state: null,            // this player's detailed state (characters, local boss, grid_stats)
  target_id: null,
  setTargetId: (id) => set({ target_id: id }),
  turn_log: [],
  chain_burst_anim: null,
  phase_anim: null,
  raid_result: null,
  is_attacking: false,       // prevents double-click on attack button

  // ── Socket ────────────────────────────────────────────────────────────────────
  initSocket: () => {
    if (socket) {
      if (!socket.connected) socket.connect();
      set({ socket_ref: socket });
      return;
    }
    socket = io({ transports: ['websocket'] });

    socket.on('connect', () => { console.log('[WS] connected'); set({ ws_connected: true }); });
    socket.on('disconnect', () => set({ ws_connected: false }));

    // Full room snapshot (on join / reconnect / ready phase)
    socket.on('room_state', (snapshot) => {
      set({ raid_state: snapshot });
      // If we're in the snapshot, pull out my_state
      const me = snapshot.players?.find(p => p.player_id === get().player_id);
      if (me) set({ my_state: me, target_id: me.target_id || snapshot.boss?.id || null });
    });

    socket.on('raid_started', ({ message }) => {
      set({ is_attacking: false });
      get().pushLog({ type: 'SYSTEM', msg: `⚔ ${message}`, ts: ts() });
    });

    socket.on('opening_log', ({ log }) => {
      const stamp = ts();
      const myChars = get().my_state?.characters || [];
      const findCharIdByName = (name) => (myChars.find(c => c.name === name)?.id) || null;
      for (const ev of (log || [])) {
        get().pushLog({ ...ev, ts: stamp });
        if (ev.type === 'BOSS_CHARGE_ATTACK') {
          const bossId = ev.source_id || get().raid_state?.boss?.id;
          if (bossId) animationBus.trigger(`boss:${bossId}`, GBF_MOTION.CHARGE, GBF_TIMING_MS.CHARGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'BOSS_CA_HIT') {
          const tid = findCharIdByName(ev.target);
          if (tid) animationBus.trigger(`char:${tid}`, GBF_MOTION.DAMAGE, GBF_TIMING_MS.DAMAGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'ALLY_KO') {
          const tid = findCharIdByName(ev.target);
          if (tid) animationBus.trigger(`char:${tid}`, GBF_MOTION.DEAD, 0, GBF_MOTION.DEAD);
        }
      }
    });

    socket.on('player_joined', ({ name }) => {
      get().pushLog({ type: 'SYSTEM', msg: `${name} joined the raid`, ts: ts() });
      get().refreshRaidState();
    });

    // ── My skill resolved ──────────────────────────────────────────────────────
    socket.on('skill_result', ({ log, shared_boss_hp, entity_hp, my_state }) => {
      const stamp = ts();
      // Update boss HP in raid_state
      set(s => {
        if (!s.raid_state) return { my_state: my_state || s.my_state, target_id: my_state?.target_id ?? s.target_id };
        const boss = s.raid_state.boss;
        const nextBossHp = entity_hp && boss?.id && entity_hp[boss.id] != null ? entity_hp[boss.id] : shared_boss_hp;
        const nextBoss = boss ? { ...boss, hp: nextBossHp } : boss;
        const nextSubs = (s.raid_state.sub_entities || []).map(se => (
          entity_hp && entity_hp[se.id] != null ? { ...se, hp: entity_hp[se.id] } : se
        ));
        return {
          raid_state: { ...s.raid_state, boss: nextBoss, sub_entities: nextSubs },
          my_state: my_state || s.my_state,
          target_id: my_state?.target_id ?? s.target_id,
        };
      });
      for (const ev of (log || [])) {
        get().pushLog({ ...ev, ts: stamp });
        if (ev.type === 'ABILITY') {
          animationBus.trigger(`char:${ev.char_id}`, GBF_MOTION.SKILL_1, GBF_TIMING_MS.SKILL, GBF_MOTION.IDLE);
        }
      }
    });

    socket.on('summon_result', ({ log, shared_boss_hp, my_state }) => {
      const stamp = ts();
      set(s => ({
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
        my_state: my_state || s.my_state,
      }));
      for (const ev of log) get().pushLog({ ...ev, ts: stamp });
    });

    socket.on('player_used_summon', ({ player_name, log, shared_boss_hp }) => {
      const stamp = ts();
      set(s => ({
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
      }));
      for (const ev of log) get().pushLog({ ...ev, ts: stamp, player_prefix: player_name });
    });

    // ── Another player used a skill ────────────────────────────────────────────
    socket.on('player_used_skill', ({ player_id, player_name, log, shared_boss_hp, entity_hp }) => {
      const stamp = ts();
      // Update shared boss HP
      set(s => ({
        raid_state: s.raid_state ? {
          ...s.raid_state,
          boss: { ...s.raid_state.boss, hp: entity_hp && entity_hp[s.raid_state.boss.id] != null ? entity_hp[s.raid_state.boss.id] : shared_boss_hp },
          sub_entities: (s.raid_state.sub_entities || []).map(se => (
            entity_hp && entity_hp[se.id] != null ? { ...se, hp: entity_hp[se.id] } : se
          )),
        } : s.raid_state,
      }));
      // Log other player's skill with their name prefix
      for (const ev of log) {
        get().pushLog({ ...ev, ts: stamp, player_prefix: player_name });
      }
    });

    // ── My attack turn resolved ────────────────────────────────────────────────
    socket.on('turn_result', ({ turn_number, attack_log, boss_log, shared_boss_hp, entity_hp, my_state, player_defeated }) => {
      const stamp = ts();
      const ms = my_state || get().my_state;
      const myChars = ms?.characters || [];
      const findCharIdByName = (name) => (myChars.find(c => c.name === name)?.id) || null;
      set(s => ({
        is_attacking: false,
        my_state: my_state || s.my_state,
        target_id: my_state?.target_id ?? s.target_id,
        raid_state: s.raid_state ? {
          ...s.raid_state,
          boss: { ...s.raid_state.boss, hp: entity_hp && entity_hp[s.raid_state.boss.id] != null ? entity_hp[s.raid_state.boss.id] : shared_boss_hp },
          sub_entities: (s.raid_state.sub_entities || []).map(se => (
            entity_hp && entity_hp[se.id] != null ? { ...se, hp: entity_hp[se.id] } : se
          )),
        } : s.raid_state,
      }));

      get().pushLog({ type: 'TURN_DIVIDER', turn: turn_number, ts: stamp });

      for (const ev of attack_log) {
        get().pushLog({ ...ev, ts: stamp });
        if (ev.type === 'NORMAL_ATTACK') {
          const key = `char:${ev.char_id}`;
          animationBus.trigger(key, GBF_MOTION.ATTACK, GBF_TIMING_MS.ATTACK, GBF_MOTION.IDLE);
          if (ev.hit_type === 'DA') {
            setTimeout(() => animationBus.trigger(key, GBF_MOTION.ATTACK, GBF_TIMING_MS.ATTACK, GBF_MOTION.IDLE), GBF_TIMING_MS.DA_DELAY);
          }
          if (ev.hit_type === 'TA') {
            setTimeout(() => animationBus.trigger(key, GBF_MOTION.ATTACK, GBF_TIMING_MS.ATTACK, GBF_MOTION.IDLE), GBF_TIMING_MS.TA_DELAY_2);
            setTimeout(() => animationBus.trigger(key, GBF_MOTION.ATTACK, GBF_TIMING_MS.ATTACK, GBF_MOTION.IDLE), GBF_TIMING_MS.TA_DELAY_3);
          }
        }
        if (ev.type === 'ABILITY') {
          animationBus.trigger(`char:${ev.char_id}`, GBF_MOTION.SKILL_1, GBF_TIMING_MS.SKILL, GBF_MOTION.IDLE);
        }
        if (ev.type === 'CHARGE_ATTACK') {
          animationBus.trigger(`char:${ev.char_id}`, GBF_MOTION.CHARGE, GBF_TIMING_MS.CHARGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'CHAIN_BURST') {
          set({ chain_burst_anim: { count: ev.chain_count, bonus_pct: ev.bonus_pct } });
          setTimeout(() => set({ chain_burst_anim: null }), 2000);
        }
      }
      for (const ev of boss_log) {
        get().pushLog({ ...ev, ts: stamp });
        if (ev.type === 'BOSS_ATTACK') {
          if (ev.source_id) animationBus.trigger(`boss:${ev.source_id}`, GBF_MOTION.ATTACK, GBF_TIMING_MS.ATTACK, GBF_MOTION.IDLE);
          const tid = findCharIdByName(ev.target_char);
          if (tid) animationBus.trigger(`char:${tid}`, GBF_MOTION.DAMAGE, GBF_TIMING_MS.DAMAGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'BOSS_CHARGE_ATTACK') {
          const bossId = ev.source_id || get().raid_state?.boss?.id;
          if (bossId) animationBus.trigger(`boss:${bossId}`, GBF_MOTION.CHARGE, GBF_TIMING_MS.CHARGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'BOSS_CA_HIT') {
          const tid = findCharIdByName(ev.target);
          if (tid) animationBus.trigger(`char:${tid}`, GBF_MOTION.DAMAGE, GBF_TIMING_MS.DAMAGE, GBF_MOTION.IDLE);
        }
        if (ev.type === 'ALLY_KO') {
          const tid = findCharIdByName(ev.target);
          if (tid) animationBus.trigger(`char:${tid}`, GBF_MOTION.DEAD, 0, GBF_MOTION.DEAD);
        }
        if (ev.type === 'PHASE_CHANGE') {
          set({ phase_anim: { phase: ev.phase, description: ev.description } });
          setTimeout(() => set({ phase_anim: null }), 3000);
        }
      }

      if (player_defeated) {
        get().pushLog({ type: 'SYSTEM', msg: '💀 Your party has been defeated...', ts: stamp });
      }
    });

    // ── Another player attacked ────────────────────────────────────────────────
    socket.on('player_attacked', ({ player_id, player_name, attack_log, shared_boss_hp, entity_hp }) => {
      const stamp = ts();
      set(s => ({
        raid_state: s.raid_state ? {
          ...s.raid_state,
          boss: { ...s.raid_state.boss, hp: entity_hp && entity_hp[s.raid_state.boss.id] != null ? entity_hp[s.raid_state.boss.id] : shared_boss_hp },
          sub_entities: (s.raid_state.sub_entities || []).map(se => (
            entity_hp && entity_hp[se.id] != null ? { ...se, hp: entity_hp[se.id] } : se
          )),
        } : s.raid_state,
      }));
      // Log summary for others (just damage events so log isn't flooded)
      for (const ev of attack_log) {
        if (['NORMAL_ATTACK','CHARGE_ATTACK','CHAIN_BURST'].includes(ev.type)) {
          get().pushLog({ ...ev, ts: stamp, player_prefix: player_name });
        }
      }
    });

    socket.on('raid_end', ({ result, rewards }) => {
      set({ raid_result: { result, rewards }, is_attacking: false });
      get().pushLog({ type: 'SYSTEM', msg: result === 'VICTORY' ? '🏆 VICTORY! Raid completed!' : '💀 DEFEAT...', ts: ts() });
    });

    socket.on('player_disconnected', ({ player_id }) => {
      get().pushLog({ type: 'SYSTEM', msg: `A player disconnected.`, ts: ts() });
      get().refreshRaidState();
    });

    socket.on('skill_error',   (e) => get().pushLog({ type: 'SYSTEM', msg: `Skill error: ${e.error}`, ts: ts() }));
    socket.on('summon_error',  (e) => get().pushLog({ type: 'SYSTEM', msg: `Summon error: ${e.error}`, ts: ts() }));
    socket.on('action_error',  (e) => { set({ is_attacking: false }); get().pushLog({ type: 'SYSTEM', msg: `Error: ${e.error}`, ts: ts() }); });
    socket.on('error', (e) => console.error('[WS]', e));

    set({ socket_ref: socket });
  },

  refreshRaidState: async () => {
    const room_id = get().current_room_id;
    if (!room_id) return;
    const snap = await fetch(`${API}/raids/${room_id}`).then(r => r.json());
    set({ raid_state: snap });
    const me = snap.players?.find(p => p.player_id === get().player_id);
    if (me) set({ my_state: me, target_id: me.target_id || snap.boss?.id || null });
  },

  joinRaid: (room_id) => {
    const { player_id, player_name, party_character_ids, grid_weapon_ids,
            main_summon_id, main_summon_stars, sub_summon_id, sub_summon_stars } = get();
    if (!socket?.connected) get().initSocket();
    set({ current_room_id: room_id, turn_log: [], raid_result: null, is_attacking: false, screen: 'battle' });
    setTimeout(() => {
      const { mc_class_id, mc_selected_skills, catalog_mc_classes } = get();
      const mc_class = catalog_mc_classes.find(cl => cl.id === mc_class_id);
      socket.emit('join_room', {
        room_id, player_id,
        player_name: player_name || 'Adventurer',
        party_config: { character_ids: party_character_ids.filter(Boolean) },
        grid_config: { weapon_ids: grid_weapon_ids.filter(Boolean) },
        mc_config: {
          class_id: mc_class_id,
          class_name: mc_class?.name || 'Fighter',
          base_hp: mc_class?.base_hp || 1820,
          base_atk: mc_class?.base_atk || 6200,
          preset_skill: mc_class?.preset_skill || null,
          selected_skills: mc_selected_skills.slice(0, 3),
          charge_attack: mc_class?.charge_attack || null,
          element: grid_weapon_ids.filter(Boolean).length > 0 ? null : 'FIRE', // server will set from main weapon
        },
        summon_config: {
          main_id:    main_summon_id,
          main_stars: main_summon_stars,
          sub_id:     sub_summon_id,
          sub_stars:  sub_summon_stars,
        },
      });
    }, 100);
  },

  useSummon: () => {
    const { current_room_id, player_id } = get();
    socket?.emit('use_summon', { room_id: current_room_id, player_id });
  },

  setReady: () => {
    const { current_room_id, player_id } = get();
    socket?.emit('player_ready', { room_id: current_room_id, player_id });
  },

  // Use a skill — instant, doesn't end turn
  useAbility: (char_id, ability_id) => {
    const { current_room_id, player_id } = get();
    // Optimistically grey out the button immediately
    const state = get().my_state;
    if (state) {
      // For MC (char_id === 'MC'), look up ability from the MC's runtime abilities list
      // For party chars, look up from catalog
      const runtime_char = state.characters.find(c => c.id === char_id);
      let cooldown_max = null;
      if (char_id === 'MC') {
        const mc_ab = runtime_char?.abilities?.find(a => a.id === ability_id);
        cooldown_max = mc_ab?.cooldown_max ?? null;
      } else {
        const catalog_char = get().catalog_characters?.find(cc => cc.id === char_id);
        const ab = catalog_char?.abilities?.find(a => a.id === ability_id);
        cooldown_max = ab?.cooldown_max ?? null;
      }
      const chars = state.characters.map(c => {
        if (c.id !== char_id) return c;
        const cds = { ...(c.ability_cooldowns || {}) };
        if (cooldown_max !== null) cds[ability_id] = cooldown_max;
        return { ...c, ability_cooldowns: cds };
      });
      set({ my_state: { ...state, characters: chars } });
    }
    socket?.emit('use_skill', { room_id: current_room_id, player_id, char_id, ability_id, target_id: get().target_id });
  },

  // Press ATTACK — resolves this player's full turn immediately
  doAttack: () => {
    const { current_room_id, player_id, is_attacking } = get();
    if (is_attacking) return;
    set({ is_attacking: true });
    socket?.emit('player_attack', { room_id: current_room_id, player_id, target_id: get().target_id });
  },

  // Combat log
  pushLog: (entry) => set(s => ({ turn_log: [entry, ...s.turn_log].slice(0, 120) })),
  clearLog: () => set({ turn_log: [] }),

  ws_connected: false,
  socket_ref: null,
}));
