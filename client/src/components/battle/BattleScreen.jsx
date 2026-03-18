import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge, HpBar, ChargeBar, BossHpBar, StatusEffectList, formatNumber } from '../../lib/ui.jsx';

// ── ELEMENT COLOUR MAP ────────────────────────────────────────────────────────
const ELEM_CLR = { FIRE:'#ff5020', WATER:'#30b4ff', EARTH:'#88cc44', WIND:'#a0ffb0', LIGHT:'#ffe860', DARK:'#c060ff' };

function AbilityFlash({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1600); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
      background:'linear-gradient(135deg,#0a2010,#102818)', border:'1px solid rgba(80,200,80,0.5)',
      borderRadius:10, padding:'10px 24px', zIndex:600, pointerEvents:'none',
      fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'#80ff98',
      boxShadow:'0 4px 24px rgba(50,180,80,0.3)', animation:'slideUp 0.2s ease',
    }}>◆ {msg}</div>
  );
}

export function BattleScreen() {
  const {
    player_id, raid_state, my_state, turn_log,
    setReady, useAbility, doAttack, is_attacking,
    chain_burst_anim, phase_anim, raid_result,
    setScreen, current_room_id, refreshRaidState, catalog_characters,
  } = useGameStore();

  const [tooltip, setTooltip] = useState(null);
  const [ability_flash, setAbilityFlash] = useState(null);
  const [log_open, setLogOpen] = useState(false);

  useEffect(() => { if (current_room_id) refreshRaidState(); }, [current_room_id]);

  const handleAbility = useCallback((char_id, ability_id, ab_name) => {
    useAbility(char_id, ability_id);
    setAbilityFlash(ab_name);
    setTooltip(null);
  }, [useAbility]);

  if (!raid_state) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div className="pulse" style={{ fontSize:'3rem', marginBottom:16 }}>⚔</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--text-gold)' }}>Connecting...</div>
          <div style={{ marginTop:8, fontSize:'0.8rem', color:'var(--text-dim)' }}>Room: {current_room_id}</div>
        </div>
      </div>
    );
  }

  const boss          = raid_state.boss;
  const is_waiting    = raid_state.status === 'WAITING';
  const is_active     = raid_state.status === 'IN_PROGRESS';
  const my_local_boss = my_state?.local_boss;
  const my_chars      = my_state?.characters || [];
  const i_am_defeated = my_chars.length > 0 && my_chars.every(c => c.hp <= 0);

  return (
    <div
      style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg-void)', overflow:'hidden' }}
      onClick={() => tooltip && setTooltip(null)}
    >
      {/* ── OVERLAYS ── */}
      {chain_burst_anim && (
        <div className="chain-burst-overlay">
          <div>
            <div className="chain-burst-text">{chain_burst_anim.count}-CHAIN BURST!</div>
            <div style={{ textAlign:'center', color:'var(--text-gold)', fontFamily:'var(--font-body)', fontSize:'1.2rem' }}>
              +{(chain_burst_anim.bonus_pct * 100).toFixed(0)}% Bonus Damage
            </div>
          </div>
        </div>
      )}
      {phase_anim && (
        <div className="phase-banner">
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'var(--hp-red)', fontWeight:900 }}>⚠ PHASE {phase_anim.phase}</div>
          <div style={{ color:'var(--text-mid)', marginTop:4 }}>{phase_anim.description}</div>
        </div>
      )}
      {ability_flash && <AbilityFlash msg={ability_flash} onDone={() => setAbilityFlash(null)} />}

      {/* ── SKILL TOOLTIP ── */}
      {tooltip && (
        <div style={{
          position:'fixed',
          left: Math.min(tooltip.x, window.innerWidth - 270),
          top: tooltip.y, transform:'translateY(calc(-100% - 8px))',
          zIndex:700, background:'var(--bg-card)', border:'1px solid var(--border-bright)',
          borderRadius:10, padding:'14px 16px', width:260,
          boxShadow:'0 12px 40px rgba(0,0,0,0.85)', pointerEvents:'none',
        }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-gold)', marginBottom:6 }}>{tooltip.ab.name}</div>
          <div style={{ fontSize:'0.82rem', color:'var(--text-mid)', lineHeight:1.55, marginBottom:10 }}>{tooltip.ab.description}</div>
          <div style={{ display:'flex', gap:12, fontSize:'0.72rem', fontFamily:'var(--font-mono)', borderTop:'1px solid var(--border-dim)', paddingTop:8 }}>
            <span style={{ color:'var(--text-dim)' }}>CD <span style={{ color:'var(--charge-blue)' }}>{tooltip.ab.cooldown_max}t</span></span>
            <span style={{ color:'var(--text-dim)' }}>Type <span style={{ color:'#80ff98' }}>{tooltip.ab.effect_type}</span></span>
          </div>
          <div style={{ marginTop:6, fontSize:'0.65rem', color:'rgba(100,180,100,0.6)', fontFamily:'var(--font-mono)' }}>
            Instant · Free action · No turn cost
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <TopBar
        current_room_id={current_room_id}
        turn_number={my_state?.turn_number ?? 0}
        status={raid_state.status}
        is_waiting={is_waiting}
        is_active={is_active}
        log_open={log_open}
        onToggleLog={() => setLogOpen(o => !o)}
        onLeave={() => setScreen('lobby')}
      />

      {/* ── ZONE 1: ENEMY ── */}
      <EnemyZone boss={boss} my_local_boss={my_local_boss} honors={my_state?.honors} />

      {/* ── ZONE 2: PARTY ── */}
      <PartyZone
        raid_players={raid_state.players}
        my_state={my_state}
        player_id={player_id}
        is_active={is_active}
      />

      {/* ── ZONE 3: ACTION BAR ── */}
      <ActionZone
        my_state={my_state}
        is_active={is_active}
        is_attacking={is_attacking}
        i_am_defeated={i_am_defeated}
        raid_result={raid_result}
        catalog_characters={catalog_characters}
        onAttack={doAttack}
        onAbility={handleAbility}
        onTooltipShow={setTooltip}
        onTooltipHide={() => setTooltip(null)}
        onReady={setReady}
        is_waiting={is_waiting}
        my_ready={raid_state.players?.find(p => p.player_id === player_id)?.is_ready}
        players={raid_state.players}
        setScreen={setScreen}
      />

      {/* ── SLIDE-IN LOG PANEL ── */}
      {log_open && (
        <div style={{
          position:'fixed', top:36, right:0, bottom:0, width:'min(340px, 100vw)',
          background:'var(--bg-panel)', borderLeft:'1px solid var(--border-dim)',
          zIndex:400, display:'flex', flexDirection:'column',
        }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-dim)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.06em' }}>BATTLE LOG</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setLogOpen(false)}>✕</button>
          </div>
          <CombatLog turn_log={turn_log} />
        </div>
      )}

      {/* ── RAID RESULT OVERLAY ── */}
      {raid_result && (
        <div style={{
          position:'fixed', inset:0, zIndex:800,
          background:'rgba(4,8,18,0.88)', display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div className="panel" style={{
            padding:'40px 48px', textAlign:'center', maxWidth:420,
            border:`2px solid ${raid_result.result==='VICTORY'?'var(--gold-bright)':'var(--hp-red)'}`,
          }}>
            <div style={{ fontSize:'4rem', marginBottom:8 }}>{raid_result.result==='VICTORY'?'🏆':'💀'}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', fontWeight:900, marginBottom:20,
              color: raid_result.result==='VICTORY'?'var(--gold-bright)':'var(--hp-red)' }}>
              {raid_result.result}
            </div>
            {raid_result.rewards?.honor_ranking && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em', marginBottom:10 }}>HONOR RANKINGS</div>
                {raid_result.rewards.honor_ranking.map(r => (
                  <div key={r.rank} style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', padding:'3px 0',
                    color: r.rank===1?'var(--gold-bright)':'var(--text-mid)' }}>
                    {r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':`#${r.rank}`} {r.name} — {r.honors.toLocaleString()} honors
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary btn-lg" onClick={() => setScreen('lobby')}>Return to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TOP BAR ───────────────────────────────────────────────────────────────────
function TopBar({ current_room_id, turn_number, status, is_waiting, is_active, log_open, onToggleLog, onLeave }) {
  return (
    <div style={{
      background:'var(--bg-panel)', borderBottom:'1px solid var(--border-dim)',
      padding:'6px 14px', display:'flex', alignItems:'center', gap:14, flexShrink:0, zIndex:10,
    }}>
      <span style={{ fontFamily:'var(--font-display)', color:'var(--text-gold)', fontWeight:700, fontSize:'0.85rem', letterSpacing:'0.06em' }}>
        SKY CHRONICLE
      </span>
      <div style={{ width:1, height:14, background:'var(--border-dim)' }} />
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--text-dim)' }}>
        {current_room_id}
      </span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--text-dim)' }}>
        T{turn_number}
      </span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', fontWeight:700,
        color: is_waiting?'#60cc60':is_active?'var(--gold-bright)':'var(--hp-red)' }}>
        {status}
      </span>
      <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
        <button className={`btn btn-ghost btn-sm${log_open?' ':' '}`}
          style={{ padding:'4px 12px', fontSize:'0.7rem', borderColor: log_open?'var(--border-bright)':undefined }}
          onClick={onToggleLog}>
          📜 Log
        </button>
        <button className="btn btn-ghost btn-sm" style={{ padding:'4px 10px' }} onClick={onLeave}>✕</button>
      </div>
    </div>
  );
}

// ── ZONE 1: ENEMY ─────────────────────────────────────────────────────────────
function EnemyZone({ boss, my_local_boss, honors }) {
  if (!boss) return null;
  const hp_pct = boss.hp / boss.hp_max;
  const rage   = my_local_boss?.charge_bar ?? 0;

  return (
    <div style={{
      background:'var(--bg-panel)', borderBottom:'1px solid var(--border-dim)',
      padding:'12px 16px', flexShrink:0,
    }}>
      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        {/* Boss art placeholder */}
        <div style={{
          width:80, height:80, flexShrink:0, borderRadius:10,
          background:'linear-gradient(135deg,rgba(100,10,10,0.4),rgba(60,0,0,0.2))',
          border:'1px solid rgba(200,32,32,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.8rem',
        }}>🐉</div>

        {/* Boss stats */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:900, color:'var(--hp-red)' }}>
              {boss.name}
            </span>
            <ElementBadge element={boss.element} />
            {my_local_boss && (
              <span style={{ fontSize:'0.68rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginLeft:'auto' }}>
                Phase {my_local_boss.current_phase}
              </span>
            )}
          </div>

          {/* HP bar */}
          <div style={{ marginBottom:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                SHARED HP — all players damage this pool
              </span>
              <span style={{ fontSize:'0.72rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--hp-red)' }}>
                {formatNumber(boss.hp)} <span style={{ color:'var(--text-dim)', fontWeight:400 }}>/ {formatNumber(boss.hp_max)}</span>
              </span>
            </div>
            <BossHpBar current={boss.hp} max={boss.hp_max} />
          </div>

          {/* Rage (charge diamonds) + debuffs row */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:'0.62rem', color:'var(--hp-red)', fontFamily:'var(--font-mono)' }}>RAGE</span>
              {/* Diamond icons */}
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:11, height:11,
                  background: rage >= (i+1)*34 ? 'var(--hp-red)' : 'transparent',
                  border:`1.5px solid ${rage >= (i+1)*34 ? 'var(--hp-red)' : 'rgba(200,32,32,0.4)'}`,
                  borderRadius:2,
                  transform:'rotate(45deg)',
                  boxShadow: rage >= (i+1)*34 ? '0 0 6px rgba(255,48,48,0.5)' : 'none',
                  transition:'all 0.3s',
                }} />
              ))}
              <span style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginLeft:4 }}>
                {rage}%
              </span>
            </div>
            {my_local_boss?.status_effects?.length > 0 && (
              <StatusEffectList effects={my_local_boss.status_effects} />
            )}
            {honors != null && (
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>HONORS</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', color:'var(--gold-bright)', fontWeight:700 }}>
                  {honors?.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ZONE 2: PARTY ─────────────────────────────────────────────────────────────
function PartyZone({ raid_players, my_state, player_id, is_active }) {
  // Show all raid players as compact rows; highlight current player
  return (
    <div style={{
      background:'var(--bg-deep)', borderBottom:'1px solid var(--border-dim)',
      padding:'8px 12px', flexShrink:0, overflowX:'auto',
    }}>
      <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
        {raid_players?.map(p => {
          const is_me = p.player_id === player_id;
          const display = is_me && my_state ? my_state : p;
          return (
            <div key={p.player_id} style={{
              background: is_me ? 'rgba(32,96,200,0.12)' : 'var(--bg-panel)',
              border:`1px solid ${is_me?'var(--border-bright)':'var(--border-dim)'}`,
              borderRadius:10, padding:'8px 10px', minWidth:160,
              boxShadow: is_me ? '0 0 14px rgba(64,144,255,0.15)' : 'none',
            }}>
              {/* Player header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'0.75rem', fontWeight:700 }}>
                  {p.name}
                  {is_me && <span style={{ color:'var(--charge-blue)', fontSize:'0.6rem', marginLeft:4 }}>(You)</span>}
                </span>
                <span style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>T{p.turn_number}</span>
              </div>
              {/* Characters */}
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {display.characters?.map(c => <CharCard key={c.id} char={c} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CharCard({ char }) {
  const dead   = char.hp <= 0;
  const hp_pct = char.hp / char.hp_max;
  const hp_cls = hp_pct > 0.6 ? '' : hp_pct > 0.3 ? ' yellow' : ' red';
  const ca_rdy = char.charge_bar >= 100;
  return (
    <div style={{ opacity:dead?0.3:1, filter:dead?'grayscale(1)':'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
        <span style={{ fontSize:'0.68rem', fontFamily:'var(--font-mono)', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:`var(--${char.element?.toLowerCase()},#888)`, display:'inline-block', flexShrink:0 }} />
          {char.name}
          {dead && <span style={{ color:'var(--hp-red)', fontSize:'0.6rem', marginLeft:2 }}>✕</span>}
        </span>
        {ca_rdy && !dead && (
          <span style={{ fontSize:'0.58rem', color:'var(--charge-blue)', fontFamily:'var(--font-mono)', fontWeight:700,
            background:'rgba(64,144,255,0.15)', padding:'1px 5px', borderRadius:4 }}>CA!</span>
        )}
        {!dead && <StatusEffectList effects={char.status_effects?.slice(0,2)} />}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 40px', gap:3, alignItems:'center', marginBottom:2 }}>
        <div className="bar-track" style={{ height:4 }}>
          <div className={`bar-fill bar-hp${hp_cls}`} style={{ width:`${Math.max(0,Math.min(100,hp_pct*100))}%` }} />
        </div>
        <span style={{ fontSize:'0.55rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', textAlign:'right' }}>
          {formatNumber(char.hp)}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 28px', gap:3, alignItems:'center' }}>
        <div className="bar-track" style={{ height:3 }}>
          <div className="bar-fill bar-charge" style={{ width:`${char.charge_bar}%` }} />
        </div>
        <span style={{ fontSize:'0.52rem', color:'var(--charge-blue)', fontFamily:'var(--font-mono)', textAlign:'right' }}>
          {char.charge_bar}%
        </span>
      </div>
    </div>
  );
}

// ── ZONE 3: ACTION BAR ────────────────────────────────────────────────────────
function ActionZone({
  my_state, is_active, is_attacking, i_am_defeated, raid_result,
  catalog_characters, onAttack, onAbility, onTooltipShow, onTooltipHide,
  onReady, is_waiting, my_ready, players, setScreen,
}) {
  if (raid_result) return null;

  // Waiting room
  if (is_waiting) {
    return (
      <div style={{ background:'var(--bg-panel)', padding:'16px', flexShrink:0, textAlign:'center' }}>
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:12, flexWrap:'wrap' }}>
          {players?.map(p => (
            <div key={p.player_id} style={{
              padding:'4px 12px', borderRadius:20, fontSize:'0.75rem', fontFamily:'var(--font-mono)',
              background: p.is_ready?'rgba(50,180,50,0.15)':'rgba(100,100,100,0.1)',
              border:`1px solid ${p.is_ready?'rgba(50,180,50,0.4)':'var(--border-dim)'}`,
              color: p.is_ready?'#60cc60':'var(--text-dim)',
            }}>{p.is_ready?'✓':'○'} {p.name}</div>
          ))}
        </div>
        {!my_ready
          ? <button className="btn btn-gold btn-lg" onClick={onReady}>✓ Ready!</button>
          : <div className="pulse" style={{ color:'#60cc60', fontFamily:'var(--font-display)' }}>✓ Ready — waiting for others...</div>
        }
      </div>
    );
  }

  if (!is_active) return null;

  const alive_chars = my_state?.characters?.filter(c => c.hp > 0) || [];

  if (i_am_defeated) {
    return (
      <div style={{ background:'var(--bg-panel)', padding:'14px 16px', flexShrink:0, textAlign:'center' }}>
        <div style={{ color:'var(--hp-red)', fontFamily:'var(--font-display)', fontSize:'1rem', marginBottom:4 }}>💀 Party Defeated</div>
        <div style={{ color:'var(--text-dim)', fontSize:'0.78rem' }}>Others may still complete the raid</div>
      </div>
    );
  }

  return (
    <div style={{
      background:'var(--bg-panel)', borderTop:'1px solid var(--border-dim)',
      flexShrink:0, display:'flex', flexDirection:'column',
    }}>
      {/* Skills rows — one row per alive character */}
      <div style={{ padding:'8px 12px 6px', borderBottom:'1px solid var(--border-dim)' }}>
        <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:5, letterSpacing:'0.05em' }}>
          SKILLS · instant · free · use before attacking
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {alive_chars.map(char => {
            const cat_char = catalog_characters?.find(cc => cc.id === char.id);
            const abilities = cat_char?.abilities || [];
            if (!abilities.length) return null;
            return (
              <div key={char.id} style={{ display:'flex', gap:5, alignItems:'center' }}>
                {/* Character label */}
                <div style={{
                  display:'flex', alignItems:'center', gap:4, flexShrink:0, width:52,
                  fontSize:'0.62rem', fontFamily:'var(--font-mono)',
                }}>
                  <span style={{
                    width:7, height:7, borderRadius:'50%', flexShrink:0,
                    background: `var(--${char.element?.toLowerCase()},#888)`,
                  }} />
                  <span style={{ color:'var(--text-mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {char.name}
                  </span>
                </div>
                {/* Skill buttons */}
                {abilities.map(ab => {
                  const cd    = char.ability_cooldowns?.[ab.id] || 0;
                  const ready = cd === 0;
                  return (
                    <button key={ab.id}
                      className="btn btn-ghost"
                      style={{
                        flex:1, padding:'6px 8px', fontSize:'0.7rem',
                        justifyContent:'space-between', minWidth:0,
                        opacity: ready ? 1 : 0.38,
                        border:`1px solid ${ready?'rgba(80,160,80,0.4)':'var(--border-dim)'}`,
                        background: ready ? 'rgba(40,80,40,0.15)' : 'transparent',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      }}
                      disabled={!ready}
                      onClick={e => { e.stopPropagation(); if (ready) onAbility(char.id, ab.id, ab.name); }}
                      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); onTooltipShow({ ab, x:r.left, y:r.top }); }}
                      onMouseLeave={onTooltipHide}
                    >
                      <span>{ab.name}</span>
                      {!ready && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--hp-red)', marginLeft:4, flexShrink:0 }}>{cd}t</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ATTACK button */}
      <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
        <button
          className="btn btn-primary"
          style={{
            flex:1, padding:'14px', fontSize:'1rem', letterSpacing:'0.08em',
            opacity: is_attacking ? 0.5 : 1,
            boxShadow: is_attacking ? 'none' : '0 0 24px rgba(32,96,184,0.45)',
            transition:'all 0.15s',
          }}
          disabled={is_attacking}
          onClick={onAttack}
        >
          {is_attacking ? '⚔ Resolving...' : '⚔  ATTACK'}
        </button>
        <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', textAlign:'center', lineHeight:1.4, flexShrink:0 }}>
          ends<br/>your turn
        </div>
      </div>
    </div>
  );
}

// ── COMBAT LOG (slide-in panel) ───────────────────────────────────────────────
function CombatLog({ turn_log }) {
  return (
    <div style={{ flex:1, overflowY:'auto', padding:'10px 14px', minHeight:0 }}>
      <div className="combat-log" style={{ display:'flex', flexDirection:'column', gap:1 }}>
        {turn_log.map((e,i) => <LogEntry key={i} entry={e} />)}
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const { type, char_name, ability_name, damage, heal, target,
          cb_bonus, chain_count, description, msg, player_prefix } = entry;

  const stamp = entry.ts
    ? <span style={{ color:'rgba(60,80,120,0.55)', marginRight:5, fontFamily:'var(--font-mono)', fontSize:'0.58rem', flexShrink:0 }}>{entry.ts}</span>
    : null;
  const prefix = player_prefix
    ? <span style={{ color:'var(--text-dim)', marginRight:4, fontSize:'0.62rem' }}>[{player_prefix}]</span>
    : null;

  if (type === 'TURN_DIVIDER') return (
    <div style={{ display:'flex', alignItems:'center', gap:5, margin:'5px 0', opacity:0.4 }}>
      <div style={{ flex:1, height:1, background:'var(--border-dim)' }} />
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text-dim)' }}>T{entry.turn}</span>
      <div style={{ flex:1, height:1, background:'var(--border-dim)' }} />
    </div>
  );

  const map = {
    NORMAL_ATTACK:      { cls:'log-attack',  t: () => `${char_name} → ${formatNumber(damage)} dmg` },
    CHARGE_ATTACK:      { cls:'log-ca',      t: () => `★ ${char_name} CA! ${formatNumber(damage)} dmg` },
    CHAIN_BURST:        { cls:'log-cb',      t: () => `⚡ ${chain_count}-CHAIN BURST! +${formatNumber(cb_bonus)}` },
    ABILITY:            { cls:'log-ability', t: () => `◆ ${char_name} [${ability_name}]${damage?' '+formatNumber(damage)+' dmg':''}` },
    HEAL:               { cls:'log-heal',    t: () => `+ ${char_name} [${ability_name}] +${formatNumber(heal)} HP` },
    BUFF_APPLIED:       { cls:'log-ability', t: () => `↑ ${char_name} [${ability_name}]` },
    DEBUFF_APPLIED:     { cls:'log-debuff',  t: () => `↓ [${ability_name||'Debuff'}] → ${target||'boss'}` },
    STATUS_APPLIED:     { cls:'log-debuff',  t: () => `↓ ${entry.effect?.type||'Status'} → ${entry.target||'?'}` },
    BOSS_ATTACK:        { cls:'log-boss',    t: () => `🔴 Boss → ${target||'?'} ${formatNumber(damage)} dmg` },
    BOSS_CA_HIT:        { cls:'log-boss',    t: () => `💥 Boss CA → ${entry.target} ${formatNumber(damage)} dmg` },
    BOSS_CHARGE_ATTACK: { cls:'log-boss',    t: () => `💥 BOSS CA: ${entry.ca_name||ability_name}!` },
    TRIGGER:            { cls:'log-trigger', t: () => `⚠ ${entry.name}: ${description}` },
    PHASE_CHANGE:       { cls:'log-phase',   t: () => `🔴 PHASE ${entry.phase}: ${description}` },
    SYSTEM:             { cls:'log-system',  t: () => msg||description||'...' },
    DOT:                { cls:'log-boss',    t: () => `🔥 ${entry.source} ${formatNumber(entry.damage)} → ${entry.target_id}` },
    REGEN:              { cls:'log-heal',    t: () => `💚 Regen +${formatNumber(entry.heal)} → ${entry.target_id}` },
    ERROR:              { cls:'log-system',  t: () => `ERR: ${entry.msg}` },
  };

  const def = map[type];
  if (!def) return null;
  return (
    <div className={def.cls} style={{ lineHeight:1.55, display:'flex', alignItems:'baseline', fontSize:'0.72rem' }}>
      {stamp}{prefix}<span>{def.t()}</span>
    </div>
  );
}
