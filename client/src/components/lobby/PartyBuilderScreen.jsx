import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge } from '../../lib/ui.jsx';

const TYPE_ICON  = { ATTACK:'⚔', DEFENSE:'🛡', HEAL:'💚', BALANCE:'⚖' };
const TYPE_COLOR = { ATTACK:'var(--hp-red)', DEFENSE:'var(--charge-blue)', HEAL:'var(--hp-green)', BALANCE:'var(--text-gold)' };

export function PartyBuilderScreen() {
  const {
    catalog_characters, loadCatalog,
    party_character_ids, setPartyCharacters,
    setScreen,
  } = useGameStore();

  const [detail_char, setDetailChar] = useState(null);

  useEffect(() => { loadCatalog(); }, []);

  const main_ids = party_character_ids.filter(Boolean);

  const toggleMain = id => {
    if (main_ids.includes(id)) {
      setPartyCharacters(main_ids.filter(x => x !== id));
    } else if (main_ids.length < 3) {
      setPartyCharacters([...main_ids, id]);
    }
  };

  const getChar = id => catalog_characters.find(c => c.id === id);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg-void)' }}>
      {/* Header */}
      <div style={{
        background:'var(--bg-panel)', borderBottom:'1px solid var(--border-dim)',
        padding:'8px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setScreen('lobby')}>← Back</button>
        <h2 style={{ color:'var(--text-gold)', fontFamily:'var(--font-display)', fontSize:'1rem', margin:0 }}>
          Party Setup
        </h2>
        <button className="btn btn-gold btn-sm" style={{ marginLeft:'auto' }} onClick={() => setScreen('lobby')}>
          ✓ Confirm
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px', maxWidth:1100, margin:'0 auto', width:'100%' }}>

        {/* ── 5-SLOT PARTY ROW (GBF style) ── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:8 }}>
            PARTY FORMATION · MC (locked) + 3 main allies + 2 sub (v2.0)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 0.75fr 0.75fr', gap:8 }}>

            {/* MC slot — locked */}
            <div style={{
              background:'rgba(120,88,0,0.08)', border:'1px solid var(--gold-dim)',
              borderRadius:10, padding:'10px 8px', minHeight:110,
              display:'flex', flexDirection:'column',
            }}>
              <div style={{ fontSize:'0.58rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', marginBottom:5, letterSpacing:'0.04em', fontWeight:700 }}>
                🔒 MC
              </div>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{
                  width:44, height:44, borderRadius:10,
                  background:'linear-gradient(135deg,rgba(120,88,0,0.4),rgba(60,40,0,0.2))',
                  border:'1px solid var(--gold-dim)',
                  margin:'0 auto 5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem',
                }}>⚔</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'0.7rem', fontWeight:700, color:'var(--text-gold)' }}>
                  Sky-Wanderer
                </div>
                <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', marginTop:2 }}>Fighter class</div>
                <div style={{ fontSize:'0.56rem', color:'var(--gold-dim)', marginTop:2 }}>elem: from grid</div>
              </div>
            </div>

            {/* 3 main ally slots */}
            {[0,1,2].map(i => {
              const char = getChar(main_ids[i]);
              return (
                <div key={i} style={{
                  background: char ? 'rgba(255,255,255,0.02)' : 'var(--bg-panel)',
                  border:`1px solid ${char?'var(--border-mid)':'var(--border-dim)'}`,
                  borderRadius:10, padding:'10px 8px', minHeight:110,
                  display:'flex', flexDirection:'column', position:'relative',
                }}>
                  <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:5 }}>
                    Ally {i+1}
                  </div>
                  {char ? (
                    <div style={{ flex:1, cursor:'pointer' }} onClick={() => setDetailChar(detail_char?.id===char.id?null:char)}>
                      <div style={{
                        width:40, height:40, borderRadius:8,
                        background:`rgba(${char.element==='FIRE'?'255,80,32':char.element==='WATER'?'48,180,255':char.element==='EARTH'?'136,204,68':char.element==='WIND'?'80,200,80':'200,200,200'},0.15)`,
                        margin:'0 auto 4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem',
                      }}>{TYPE_ICON[char.type]}</div>
                      <div style={{ fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:700, textAlign:'center', marginBottom:3 }}>
                        {char.name}
                      </div>
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <ElementBadge element={char.element} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:3 }}>
                      <span style={{ fontSize:'1.4rem', opacity:0.2 }}>+</span>
                      <span style={{ fontSize:'0.58rem', color:'var(--text-dim)' }}>pick from roster</span>
                    </div>
                  )}
                  {char && (
                    <button
                      className="btn btn-danger"
                      style={{ position:'absolute', top:5, right:5, padding:'1px 5px', fontSize:'0.55rem', minHeight:'unset' }}
                      onClick={e => { e.stopPropagation(); toggleMain(char.id); }}
                    >✕</button>
                  )}
                </div>
              );
            })}

            {/* 2 sub slots — future */}
            {[0,1].map(i => (
              <div key={`sub${i}`} style={{
                background:'transparent', border:'1px dashed var(--border-dim)',
                borderRadius:10, padding:'10px 8px', minHeight:110,
                display:'flex', flexDirection:'column', opacity:0.4,
              }}>
                <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:5 }}>
                  Sub {i+1}
                </div>
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:3 }}>
                  <span style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>v2.0</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MC INFO ── */}
        <div className="panel" style={{ padding:14, marginBottom:20, border:'1px solid var(--gold-dim)', background:'rgba(120,88,0,0.06)' }}>
          <div style={{ fontSize:'0.65rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', marginBottom:8, letterSpacing:'0.06em' }}>
            🛡 MAIN CHARACTER INFO
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, fontSize:'0.78rem', color:'var(--text-mid)', lineHeight:1.7 }}>
            <div>
              <div>Element: <span style={{ color:'var(--text-dim)' }}>Inherits from Main Weapon slot 0</span></div>
              <div>Class: <span style={{ color:'var(--text-dim)' }}>Fighter (locked in MVP)</span></div>
              <div>CA: <span style={{ color:'var(--text-dim)' }}>Defined by main weapon</span></div>
            </div>
            <div>
              <div>⚔ Attacks each turn with allies</div>
              <div>⚡ CA triggers at 100% charge bar</div>
              <div>📊 Stats boosted by weapon grid</div>
            </div>
          </div>
          <div style={{ marginTop:8, fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', padding:'4px 8px', background:'rgba(0,0,0,0.3)', borderRadius:5 }}>
            ℹ Class tiers I–IV, skill inheritance &amp; EMP unlockable in future versions
          </div>
        </div>

        {/* ── CHARACTER ROSTER ── */}
        <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:10 }}>
          CHARACTER ROSTER ({main_ids.length}/3 selected) — tap card to expand details
        </div>
        <div className="party-grid">
          {catalog_characters.map(char => {
            const selected  = main_ids.includes(char.id);
            const full      = main_ids.length >= 3 && !selected;
            const expanded  = detail_char?.id === char.id;
            return (
              <CharacterCard
                key={char.id}
                char={char}
                selected={selected}
                disabled={full}
                expanded={expanded}
                onToggle={() => { toggleMain(char.id); if (!selected) setDetailChar(null); }}
                onExpand={() => setDetailChar(expanded ? null : char)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CHARACTER CARD ─────────────────────────────────────────────────────────────
function CharacterCard({ char, selected, disabled, expanded, onToggle, onExpand }) {
  return (
    <div
      className="panel"
      style={{
        padding: expanded ? 18 : 14,
        border:`1px solid ${selected?'var(--border-bright)':'var(--border-dim)'}`,
        background: selected ? 'rgba(32,96,200,0.10)' : 'var(--bg-panel)',
        opacity: disabled && !selected ? 0.5 : 1,
        transition:'all 0.15s',
        boxShadow: selected ? '0 0 18px rgba(64,144,255,0.18)' : 'none',
        cursor: 'pointer',
      }}
      onClick={onExpand}
    >
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.95rem' }}>{char.name}</div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', fontStyle:'italic' }}>{char.title}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
          <span style={{ fontSize:'1.2rem' }}>{TYPE_ICON[char.type]}</span>
          <span style={{ fontSize:'0.62rem', color:TYPE_COLOR[char.type], fontFamily:'var(--font-mono)', fontWeight:700 }}>
            {char.type}
          </span>
        </div>
      </div>

      {/* Element + base stats */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
        <ElementBadge element={char.element} />
        <span style={{ fontSize:'0.68rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
          ATK {char.base_atk} · HP {char.base_hp}
        </span>
        <span style={{ fontSize:'0.63rem', color:'var(--charge-blue)', fontFamily:'var(--font-mono)', marginLeft:'auto' }}>
          +{char.charge_gain_per_turn}/t
        </span>
      </div>

      {/* Ability name pills — always visible */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
        {char.abilities.map(a => (
          <span key={a.id} style={{
            fontSize:'0.6rem', fontFamily:'var(--font-mono)',
            padding:'2px 8px', borderRadius:20,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid var(--border-dim)',
            color:'var(--text-mid)',
          }}>{a.name}</span>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div>
          <div className="divider" />
          {char.abilities.map(a => (
            <div key={a.id} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', fontWeight:700, color:'var(--text-bright)' }}>
                  {a.name}
                </span>
                <span style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                  CD {a.cooldown_max}t
                </span>
              </div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', lineHeight:1.5 }}>{a.description}</div>
            </div>
          ))}
          <div className="divider" />
          <div style={{ marginTop:6 }}>
            <span style={{ color:'var(--text-gold)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.78rem' }}>
              CA: {char.charge_attack.name}
            </span>
            <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', lineHeight:1.5, marginTop:2 }}>
              {char.charge_attack.description}
            </div>
          </div>
        </div>
      )}

      {/* Add / Remove button */}
      <div style={{ marginTop:expanded?12:6, display:'flex', gap:6 }}>
        {selected ? (
          <button
            className="btn btn-danger btn-sm"
            style={{ flex:1 }}
            onClick={e => { e.stopPropagation(); onToggle(); }}
          >Remove from Party</button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex:1 }}
            disabled={disabled}
            onClick={e => { e.stopPropagation(); if (!disabled) onToggle(); }}
          >Add to Party</button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); onExpand(); }}
        >{expanded ? '▲' : '▼'}</button>
      </div>
    </div>
  );
}