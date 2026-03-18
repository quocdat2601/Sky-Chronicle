import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge } from '../../lib/ui.jsx';

export function LobbyScreen() {
  const {
    player_name, setPlayerName, player_id,
    catalog_bosses, loadCatalog, loadRaids, raids_list,
    createRaid, joinRaid, setScreen,
  } = useGameStore();

  const [nameInput, setNameInput] = useState(player_name);
  const [creating, setCreating] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  useEffect(() => {
    loadCatalog();
    loadRaids();
    const t = setInterval(loadRaids, 5000);
    return () => clearInterval(t);
  }, []);

  const handleCreate = async (boss_id) => {
    if (!player_name) return alert('Please set your name first!');
    setCreating(true);
    const room_id = await createRaid(boss_id);
    joinRaid(room_id);
    setCreating(false);
  };

  const handleJoin = () => {
    if (!player_name) return alert('Please set your name first!');
    if (!joinInput.trim()) return;
    joinRaid(joinInput.trim().toUpperCase());
  };

  return (
    <div className="lobby-root">

      {/* Header */}
      <div className="text-center slide-up" style={{ marginBottom: 32 }}>
        <h1 className="shimmer-gold lobby-title">SKY CHRONICLE</h1>
        <p className="lobby-subtitle" style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
          Turn-based RPG · Multiplayer Raids · Weapon Grid
        </p>
      </div>

      <div className="lobby-grid">

        {/* Left — Player setup */}
        <div className="flex-col gap-md slide-up">

          {/* Profile */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 14, color: 'var(--text-gold)' }}>⚔ Adventurer Profile</h3>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>Your Name</label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              onKeyDown={e => e.key === 'Enter' && setPlayerName(nameInput)}
            />
            <button className="btn btn-gold w-full" style={{ marginTop: 10 }} onClick={() => setPlayerName(nameInput)}>
              Set Name
            </button>
            {player_name && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-deep)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Playing as</span>
                <span style={{ color: 'var(--text-gold)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>{player_name}</span>
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              ID: {player_id}
            </div>
          </div>

          {/* Join */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--text-gold)' }}>🚪 Join Existing Raid</h3>
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Enter room code..."
              style={{ letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn btn-primary w-full" style={{ marginTop: 10 }} onClick={handleJoin} disabled={!joinInput}>
              Join Raid
            </button>
          </div>

          {/* Prep */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--text-gold)' }}>⚙ Preparation</h3>
            <div className="flex-col gap-sm">
              <button className="btn btn-ghost w-full" onClick={() => setScreen('party_builder')}>
                👥 Build Party
              </button>
              <button className="btn btn-ghost w-full" onClick={() => setScreen('grid_builder')}>
                🗡 Weapon Grid
              </button>
            </div>
          </div>
        </div>

        {/* Right — Boss list + raids */}
        <div className="flex-col gap-md slide-up">
          <div className="panel" style={{ padding: 20 }}>
            <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>⚡ Create New Raid</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {catalog_bosses.map(boss => (
                <BossCard key={boss.id} boss={boss} onCreate={() => handleCreate(boss.id)} loading={creating} disabled={!player_name} />
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.1rem' }}>🌐 Active Raids</h2>
              <button className="btn btn-ghost btn-sm" onClick={loadRaids}>↺</button>
            </div>
            {raids_list.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '16px 0', fontSize: '0.9rem' }}>
                No active raids. Create one above!
              </p>
            ) : (
              <div className="flex-col gap-sm">
                {raids_list.map(raid => (
                  <RaidListItem key={raid.room_id} raid={raid} onJoin={() => {
                    if (!player_name) return alert('Set your name first!');
                    joinRaid(raid.room_id);
                  }} disabled={!player_name} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BossCard({ boss, onCreate, loading, disabled }) {
  return (
    <div className="panel-inner" style={{
      padding: 16, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s', border: '1px solid var(--border-dim)',
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = 'var(--border-mid)')}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <ElementBadge element={boss.element} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {(boss.hp_max / 1000).toFixed(0)}K HP
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-bright)', lineHeight: 1.3 }}>
        {boss.name}
      </div>
      <button className="btn btn-primary w-full btn-sm" onClick={onCreate} disabled={loading || disabled}>
        {loading ? '...' : '⚔ Create Raid'}
      </button>
    </div>
  );
}

function RaidListItem({ raid, onJoin, disabled }) {
  const statusColor = { WAITING: '#60cc60', IN_PROGRESS: '#f0c030', VICTORY: '#8888cc', DEFEAT: '#cc4040' };
  return (
    <div className="panel-inner" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{
        width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
        background: statusColor[raid.status] || 'var(--text-dim)',
        boxShadow: `0 0 6px ${statusColor[raid.status] || 'transparent'}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {raid.boss_name}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {raid.room_id} · {raid.player_count}/4 · {raid.status}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <ElementBadge element={raid.boss_element} />
        {raid.status === 'WAITING' && (
          <button className="btn btn-primary btn-sm" onClick={onJoin} disabled={disabled}>Join</button>
        )}
      </div>
    </div>
  );
}
