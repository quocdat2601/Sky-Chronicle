import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { CHARACTERS, WEAPONS, BOSSES, MC_CLASSES } from './data/catalog.js';
import { calcGridStats } from './engine/combat.js';
import {
  createRoom, joinRoom, setPlayerReady,
  useSkill, playerAttack,
  disconnectPlayer, getRoomSnapshot, getPlayerSnapshot, getAllRooms, getRoom,
} from './raid/raidManager.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── REST ──────────────────────────────────────────────────────────────────────
app.get('/api/catalog/characters', (_, res) => res.json(CHARACTERS));
app.get('/api/catalog/weapons',    (_, res) => res.json(WEAPONS));
app.get('/api/catalog/mc-classes', (_, res) => res.json(MC_CLASSES));
app.get('/api/catalog/bosses',     (_, res) => res.json(BOSSES.map(b => ({
  id: b.id, name: b.name, element: b.element, hp_max: b.hp_max,
}))));

app.post('/api/grid/calculate', (req, res) => {
  const { weapon_ids } = req.body;
  if (!Array.isArray(weapon_ids)) return res.status(400).json({ error: 'weapon_ids required' });
  const weapons = weapon_ids.map(id => WEAPONS.find(w => w.id === id)).filter(Boolean);
  res.json(calcGridStats(weapons));
});

app.get('/api/raids',     (_, res) => res.json(getAllRooms()));
app.get('/api/raids/:id', (req, res) => {
  const snap = getRoomSnapshot(req.params.id);
  if (!snap) return res.status(404).json({ error: 'Room not found' });
  res.json(snap);
});

app.post('/api/raids', (req, res) => {
  const { boss_id, player_id, player_name } = req.body;
  if (!boss_id || !player_id) return res.status(400).json({ error: 'boss_id and player_id required' });
  try {
    const room_id = createRoom({ boss_id, creator_id: player_id, creator_name: player_name || 'Player' });
    res.json({ room_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/raids/:id/join', (req, res) => {
  const { player_id, player_name, party_config, grid_config } = req.body;
  const result = joinRoom({ room_id: req.params.id, player_id, player_name: player_name || 'Player', party_config, grid_config });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/health', (_, res) => res.json({ ok: true }));

// ── WEBSOCKET ─────────────────────────────────────────────────────────────────
const socket_map = new Map(); // socket.id → { player_id, room_id }

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.id}`);

  // ── join_room ──
  socket.on('join_room', ({ room_id, player_id, player_name, party_config, grid_config }) => {
    const result = joinRoom({ room_id, player_id, player_name, party_config, grid_config });
    if (result.error) { socket.emit('error', result); return; }

    socket.join(room_id);
    socket_map.set(socket.id, { player_id, room_id });

    socket.emit('room_state', getRoomSnapshot(room_id));
    socket.to(room_id).emit('player_joined', { player_id, name: player_name });
    console.log(`[WS] ${player_name} joined ${room_id}`);
  });

  // ── player_ready ──
  socket.on('player_ready', ({ room_id, player_id }) => {
    const room = setPlayerReady(room_id, player_id);
    if (!room) return;
    const snap = getRoomSnapshot(room_id);
    io.to(room_id).emit('room_state', snap);
    if (room.status === 'IN_PROGRESS') {
      io.to(room_id).emit('raid_started', { message: 'All players ready — RAID BEGINS!', boss: snap.boss });
    }
  });

  // ── use_skill (instant, pre-attack, doesn't end turn) ──
  socket.on('use_skill', ({ room_id, player_id, char_id, ability_id }) => {
    const result = useSkill(room_id, player_id, char_id, ability_id);
    if (result.error) { socket.emit('skill_error', result); return; }

    // Confirm to the casting player with full updated state
    const room = getRoom(room_id);
    const player = room?.players.find(p => p.player_id === player_id);

    socket.emit('skill_result', {
      log: result.log,
      shared_boss_hp: result.shared_boss_hp,
      my_state: player ? getPlayerSnapshot(player) : null,
    });

    // Tell all OTHER players boss HP changed and what skill was used
    socket.to(room_id).emit('player_used_skill', {
      player_id,
      player_name: player?.name,
      log: result.log,
      shared_boss_hp: result.shared_boss_hp,
    });

    if (result.victory) {
      io.to(room_id).emit('raid_end', { result: 'VICTORY', rewards: result.rewards });
    }
  });

  // ── player_attack (ends this player's turn) ──
  socket.on('player_attack', ({ room_id, player_id }) => {
    const result = playerAttack(room_id, player_id);
    if (result.error) { socket.emit('action_error', result); return; }

    const room = getRoom(room_id);
    const player = room?.players.find(p => p.player_id === player_id);

    // Send full turn resolution back to the attacker
    socket.emit('turn_result', {
      turn_number: result.turn_number,
      attack_log: result.attack_log,
      boss_log: result.boss_log,
      shared_boss_hp: result.shared_boss_hp,
      my_state: player ? getPlayerSnapshot(player) : null,
      player_defeated: result.player_defeated,
    });

    // Broadcast updated boss HP + player's attack summary to others
    socket.to(room_id).emit('player_attacked', {
      player_id,
      player_name: player?.name,
      attack_log: result.attack_log,
      shared_boss_hp: result.shared_boss_hp,
    });

    if (result.victory) {
      io.to(room_id).emit('raid_end', { result: 'VICTORY', rewards: result.rewards });
    }
  });

  // ── request_state ──
  socket.on('request_state', ({ room_id }) => {
    const snap = getRoomSnapshot(room_id);
    if (snap) socket.emit('room_state', snap);
  });

  // ── disconnect ──
  socket.on('disconnect', () => {
    const info = socket_map.get(socket.id);
    if (info) {
      disconnectPlayer(info.room_id, info.player_id);
      io.to(info.room_id).emit('player_disconnected', { player_id: info.player_id });
      socket_map.delete(socket.id);
    }
    console.log(`[WS] Disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌌 Sky Chronicle running on http://localhost:${PORT}\n`);
});
