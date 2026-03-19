import { create } from 'zustand';
import { io } from 'socket.io-client';
import { SKILL_TYPES } from '@server-data/catalog.js';

const API = '/api';
let socket = null;

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
  loadCatalog: async () => {
    const [chars, weaps, bosses] = await Promise.all([
      fetch(`${API}/catalog/characters`).then(r => r.json()),
      fetch(`${API}/catalog/weapons`).then(r => r.json()),
      fetch(`${API}/catalog/bosses`).then(r => r.json()),
    ]);
    set({ catalog_characters: chars, catalog_weapons: weaps, catalog_bosses: bosses });
  },

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
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json());

  const grid_weapons = ids.map(id => get().catalog_weapons.find(w => w.id === id)).filter(Boolean);
  
  // TỰ ĐỘNG KHỞI TẠO TẤT CẢ SKILL TỪ CONSTANTS
  const skill_accumulators = {};
  Object.keys(SKILL_TYPES).forEach(key => {
    skill_accumulators[key] = 0;
  });

  // Cộng dồn chỉ số thực tế
  grid_weapons.forEach(w => {
    w.skills.forEach(sk => {
      if (skill_accumulators.hasOwnProperty(sk.skill_type)) {
        const mag = sk.magnitude_base + (sk.skill_level - 1) * sk.magnitude_per_level;
        skill_accumulators[sk.skill_type] += mag;
      }
    });
  });

  set({ grid_stats: { 
    ...stats, 
    active_skills: skill_accumulators, // Lưu trữ toàn bộ object kỹ năng
    estimated_dmg: stats.grid_atk * stats.normal_mult * stats.omega_mult * stats.ex_mult
  }});

  // Tính toán các trường dữ liệu cụ thể mà GridStatsPanel yêu cầu
  const enriched_stats = {
    ...stats,
    active_skills: skill_accumulators,
    // Tính toán các trường fallback để tránh lỗi giao diện
    hp_boost_pct: (skill_accumulators['HP_BOOST'] || 0) * 100,
    dmg_cap_na: (skill_accumulators['DMG_CAP_NA'] || 0) * 100,
    dmg_cap_ca: (skill_accumulators['DMG_CAP_CA'] || 0) * 100,
    stamina_boost_pct: (skill_accumulators['STAMINA_NORMAL'] || 0 + skill_accumulators['STAMINA_OMEGA'] || 0) * 100,
    enmity_boost_pct: (skill_accumulators['ENMITY_NORMAL'] || 0 + skill_accumulators['ENMITY_OMEGA'] || 0) * 100,
    defense_boost: (skill_accumulators['DEF'] || 0) * 100,
    supplemental: skill_accumulators['SUPPLEMENTAL'] || 0,
    estimated_dmg: stats.grid_atk * stats.normal_mult * stats.omega_mult * stats.ex_mult
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
  turn_log: [],
  chain_burst_anim: null,
  phase_anim: null,
  raid_result: null,
  is_attacking: false,       // prevents double-click on attack button

  // ── Socket ────────────────────────────────────────────────────────────────────
  initSocket: () => {
    if (socket?.connected) return;
    socket = io({ transports: ['websocket'] });

    socket.on('connect', () => { console.log('[WS] connected'); set({ ws_connected: true }); });
    socket.on('disconnect', () => set({ ws_connected: false }));

    // Full room snapshot (on join / reconnect / ready phase)
    socket.on('room_state', (snapshot) => {
      set({ raid_state: snapshot });
      // If we're in the snapshot, pull out my_state
      const me = snapshot.players?.find(p => p.player_id === get().player_id);
      if (me) set({ my_state: me });
    });

    socket.on('raid_started', ({ message }) => {
      set({ is_attacking: false });
      get().pushLog({ type: 'SYSTEM', msg: `⚔ ${message}`, ts: ts() });
    });

    socket.on('player_joined', ({ name }) => {
      get().pushLog({ type: 'SYSTEM', msg: `${name} joined the raid`, ts: ts() });
      get().refreshRaidState();
    });

    // ── My skill resolved ──────────────────────────────────────────────────────
    socket.on('skill_result', ({ log, shared_boss_hp, my_state }) => {
      const stamp = ts();
      // Update boss HP in raid_state
      set(s => ({
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
        my_state: my_state || s.my_state,
      }));
      for (const ev of log) get().pushLog({ ...ev, ts: stamp });
    });

    // ── Another player used a skill ────────────────────────────────────────────
    socket.on('player_used_skill', ({ player_id, player_name, log, shared_boss_hp }) => {
      const stamp = ts();
      // Update shared boss HP
      set(s => ({
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
      }));
      // Log other player's skill with their name prefix
      for (const ev of log) {
        get().pushLog({ ...ev, ts: stamp, player_prefix: player_name });
      }
    });

    // ── My attack turn resolved ────────────────────────────────────────────────
    socket.on('turn_result', ({ turn_number, attack_log, boss_log, shared_boss_hp, my_state, player_defeated }) => {
      const stamp = ts();
      set(s => ({
        is_attacking: false,
        my_state: my_state || s.my_state,
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
      }));

      get().pushLog({ type: 'TURN_DIVIDER', turn: turn_number, ts: stamp });

      for (const ev of attack_log) {
        get().pushLog({ ...ev, ts: stamp });
        if (ev.type === 'CHAIN_BURST') {
          set({ chain_burst_anim: { count: ev.chain_count, bonus_pct: ev.bonus_pct } });
          setTimeout(() => set({ chain_burst_anim: null }), 2000);
        }
      }
      for (const ev of boss_log) {
        get().pushLog({ ...ev, ts: stamp });
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
    socket.on('player_attacked', ({ player_id, player_name, attack_log, shared_boss_hp }) => {
      const stamp = ts();
      set(s => ({
        raid_state: s.raid_state ? { ...s.raid_state, boss: { ...s.raid_state.boss, hp: shared_boss_hp } } : s.raid_state,
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

    socket.on('skill_error', (e) => get().pushLog({ type: 'SYSTEM', msg: `Skill error: ${e.error}`, ts: ts() }));
    socket.on('action_error', (e) => { set({ is_attacking: false }); get().pushLog({ type: 'SYSTEM', msg: `Error: ${e.error}`, ts: ts() }); });
    socket.on('error', (e) => console.error('[WS]', e));

    set({ socket_ref: socket });
  },

  refreshRaidState: async () => {
    const room_id = get().current_room_id;
    if (!room_id) return;
    const snap = await fetch(`${API}/raids/${room_id}`).then(r => r.json());
    set({ raid_state: snap });
    const me = snap.players?.find(p => p.player_id === get().player_id);
    if (me) set({ my_state: me });
  },

  joinRaid: (room_id) => {
    const { player_id, player_name, party_character_ids, grid_weapon_ids } = get();
    if (!socket?.connected) get().initSocket();
    set({ current_room_id: room_id, turn_log: [], raid_result: null, is_attacking: false, screen: 'battle' });
    setTimeout(() => {
      socket.emit('join_room', {
        room_id, player_id,
        player_name: player_name || 'Adventurer',
        party_config: { character_ids: party_character_ids.filter(Boolean) },
        grid_config: { weapon_ids: grid_weapon_ids.filter(Boolean) },
      });
    }, 100);
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
      const catalog_char = get().catalog_characters?.find(cc => cc.id === char_id);
      const ab = catalog_char?.abilities?.find(a => a.id === ability_id);
      const chars = state.characters.map(c => {
        if (c.id !== char_id) return c;
        const cds = { ...(c.ability_cooldowns || {}) };
        if (ab) cds[ability_id] = ab.cooldown_max;
        return { ...c, ability_cooldowns: cds };
      });
      set({ my_state: { ...state, characters: chars } });
    }
    socket?.emit('use_skill', { room_id: current_room_id, player_id, char_id, ability_id });
  },

  // Press ATTACK — resolves this player's full turn immediately
  doAttack: () => {
    const { current_room_id, player_id, is_attacking } = get();
    if (is_attacking) return;
    set({ is_attacking: true });
    socket?.emit('player_attack', { room_id: current_room_id, player_id });
  },

  // Combat log
  pushLog: (entry) => set(s => ({ turn_log: [entry, ...s.turn_log].slice(0, 120) })),
  clearLog: () => set({ turn_log: [] }),

  ws_connected: false,
  socket_ref: null,
}));
