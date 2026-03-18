import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge, RARITY_STARS } from '../../lib/ui.jsx';

const SKILL_LABEL = {
  ATK_NORMAL:'Normal', ATK_OMEGA:'Omega', ATK_EX:'EX',
  HP_BOOST:'HP+', CRITICAL_RATE:'Crit', CHARGE_SPEED:'Spd',
  STAMINA:'Stam', ENMITY:'Enmity', DMG_CAP:'Cap',
};
const SKILL_CLR = {
  ATK_OMEGA:'var(--charge-blue)', ATK_EX:'var(--text-gold)',
  ATK_NORMAL:'var(--text-mid)', STAMINA:'var(--hp-green)',
  ENMITY:'var(--hp-red)', CRITICAL_RATE:'var(--crit-orange)',
};

export function GridBuilderScreen() {
  const {
    catalog_weapons, loadCatalog,
    grid_weapon_ids, setGridWeapon, clearGridSlot,
    grid_stats, calculateGridStats, setScreen,
  } = useGameStore();

  const [selected_slot, setSelectedSlot] = useState(null);
  const [filter_elem, setFilterElem] = useState('ALL');

  useEffect(() => { loadCatalog(); calculateGridStats(); }, []);
  useEffect(() => { calculateGridStats(); }, [grid_weapon_ids]);

  const getWeapon   = id => catalog_weapons.find(w => w.id === id);
  const main_weapon = getWeapon(grid_weapon_ids[0]);
  const filtered    = catalog_weapons.filter(w => filter_elem === 'ALL' || w.element === filter_elem);
  const skillMag    = sk => ((sk.magnitude_base + (sk.skill_level - 1) * sk.magnitude_per_level) * 100).toFixed(1) + '%';

  const pickSlot = slot => setSelectedSlot(selected_slot === slot ? null : slot);
  const pickWeapon = id => { if (selected_slot !== null) { setGridWeapon(selected_slot, id); setSelectedSlot(null); } };

  return (
    <div className="grid-builder-root" style={{ height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ background:'var(--bg-panel)', borderBottom:'1px solid var(--border-dim)', padding:'8px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setScreen('lobby')}>← Back</button>
        <h2 style={{ color:'var(--text-gold)', fontFamily:'var(--font-display)', fontSize:'1rem', margin:0 }}>Weapon Grid</h2>
        {selected_slot !== null && (
          <span style={{ fontSize:'0.72rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', marginLeft:'auto' }}>
            ▶ Slot {selected_slot}{selected_slot===0?' (Main)':''} — click a weapon to assign
          </span>
        )}
        {grid_stats && main_weapon && (
          <div style={{ marginLeft: selected_slot===null?'auto':8, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:'0.7rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>Party:</span>
            <ElementBadge element={main_weapon.element} />
          </div>
        )}
      </div>

      {/* Body: left grid, right picker */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 360px', overflow:'hidden', minHeight:0 }}>

        {/* ── LEFT: GRID + STATS ── */}
        <div style={{ overflowY:'auto', padding:'14px 14px 14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Main weapon — large featured slot */}
          <div>
            <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
              MAIN WEAPON · sets party element & MC charge attack
            </div>
            <MainWeaponSlot
              weapon={main_weapon}
              selected={selected_slot === 0}
              onSelect={() => pickSlot(0)}
              onClear={() => { clearGridSlot(0); setSelectedSlot(null); }}
              skillMag={skillMag}
            />
          </div>

          {/* Sub weapons — 3×3 grid */}
          <div>
            <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
              SUB WEAPONS · all skills always active regardless of slot position
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:7 }}>
              {[1,2,3,4,5,6,7,8,9].map(slot => (
                <SubWeaponSlot
                  key={slot}
                  slot={slot}
                  weapon={getWeapon(grid_weapon_ids[slot])}
                  selected={selected_slot === slot}
                  onSelect={() => pickSlot(slot)}
                  onClear={() => { clearGridSlot(slot); setSelectedSlot(null); }}
                  skillMag={skillMag}
                />
              ))}
            </div>
          </div>

          {/* Grid stats */}
          {grid_stats && (
            <div className="panel" style={{ padding:14 }}>
              <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:10 }}>
                GRID STATS PREVIEW
              </div>
              {/* Multiplier cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
                {[
                  ['Normal ×', grid_stats.normal_mult.toFixed(3), 'var(--text-bright)'],
                  ['Omega ×',  grid_stats.omega_mult.toFixed(3),  'var(--charge-blue)'],
                  ['EX ×',     grid_stats.ex_mult.toFixed(3),     'var(--text-gold)'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-mid)', borderRadius:8, padding:'9px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{l}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'1rem', fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {[
                  ['ATK',  grid_stats.grid_atk?.toLocaleString()],
                  ['HP',   grid_stats.grid_hp?.toLocaleString()],
                  ['Crit', (grid_stats.crit_rate*100).toFixed(1)+'%'],
                  ['Spd',  grid_stats.charge_speed_bonus?(grid_stats.charge_speed_bonus*100).toFixed(0)+'%':'0%'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-dim)', borderRadius:7, padding:'7px 8px' }}>
                    <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.82rem', color:'var(--text-bright)', fontWeight:700 }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
              <div className="divider" style={{ margin:'10px 0' }} />
              <div style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', lineHeight:1.6 }}>
                DMG = ATK × {grid_stats.normal_mult.toFixed(2)} × {grid_stats.omega_mult.toFixed(2)} × {grid_stats.ex_mult.toFixed(2)} × Elem × Crit − DEF
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: WEAPON PICKER ── */}
        <div style={{ borderLeft:'1px solid var(--border-dim)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-dim)', flexShrink:0 }}>
            <div style={{ fontSize:'0.68rem', fontFamily:'var(--font-mono)', marginBottom:8,
              color: selected_slot!==null?'var(--gold-bright)':'var(--text-dim)',
              fontWeight: selected_slot!==null ? 700 : 400 }}>
              {selected_slot!==null ? `▶ Assigning to Slot ${selected_slot}` : 'SELECT A SLOT TO ASSIGN'}
            </div>
            {/* Element filters */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {['ALL','FIRE','WATER','EARTH','WIND','LIGHT','DARK'].map(e => (
                <button key={e} className="btn btn-ghost btn-sm"
                  style={{
                    padding:'3px 9px', fontSize:'0.62rem',
                    borderColor: filter_elem===e?'var(--border-bright)':undefined,
                    color: filter_elem===e?'var(--text-bright)':undefined,
                    background: filter_elem===e?'rgba(32,96,200,0.12)':undefined,
                  }}
                  onClick={() => setFilterElem(e)}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Weapon list */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:5 }}>
            {filtered.map(w => {
              const in_grid   = grid_weapon_ids.includes(w.id);
              const clickable = selected_slot!==null && !in_grid;
              return (
                <div key={w.id} style={{
                  background:'var(--bg-card)', borderRadius:9,
                  border:`1px solid ${in_grid?'var(--border-dim)':clickable?'var(--border-dim)':'var(--border-dim)'}`,
                  padding:'9px 11px',
                  cursor: clickable?'pointer':'default',
                  opacity: in_grid ? 0.4 : 1,
                  transition:'all 0.12s',
                }}
                  onClick={() => clickable && pickWeapon(w.id)}
                  onMouseEnter={e => { if(clickable) e.currentTarget.style.borderColor='var(--border-bright)'; }}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-dim)'}
                >
                  {/* Row 1: name + rarity */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'0.82rem', fontWeight:700 }}>{w.name}</span>
                    <span className={`rarity-${w.rarity}`} style={{ fontSize:'0.68rem', fontFamily:'var(--font-mono)' }}>
                      {RARITY_STARS[w.rarity]} {w.rarity}
                    </span>
                  </div>
                  {/* Row 2: element + stats */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <ElementBadge element={w.element} />
                    <span style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                      ATK {w.base_atk} · HP {w.base_hp}
                    </span>
                  </div>
                  {/* Row 3: skill pills */}
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {w.skills.map((sk,i) => (
                      <span key={i} style={{
                        fontSize:'0.6rem', fontFamily:'var(--font-mono)',
                        padding:'2px 7px', borderRadius:20,
                        background:'rgba(255,255,255,0.05)',
                        border:`1px solid ${SKILL_CLR[sk.skill_type]||'var(--border-dim)'}`,
                        color: SKILL_CLR[sk.skill_type]||'var(--text-mid)',
                      }}>
                        {SKILL_LABEL[sk.skill_type]||sk.skill_type} +{skillMag(sk)}
                      </span>
                    ))}
                  </div>
                  {in_grid && <div style={{ fontSize:'0.6rem', color:'var(--gold-dim)', marginTop:4, fontFamily:'var(--font-mono)' }}>✓ In grid</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN WEAPON SLOT ──────────────────────────────────────────────────────────
function MainWeaponSlot({ weapon, selected, onSelect, onClear, skillMag }) {
  return (
    <div style={{
      border: `2px solid ${selected?'var(--border-bright)':weapon?'var(--gold-dim)':'var(--border-dim)'}`,
      borderRadius: 12,
      padding: 16,
      cursor: 'pointer',
      background: selected
        ? 'rgba(32,96,200,0.12)'
        : weapon
          ? 'linear-gradient(135deg,rgba(120,88,0,0.12),rgba(60,40,0,0.08))'
          : 'transparent',
      transition: 'all 0.15s',
      position: 'relative',
      userSelect: 'none',
      minHeight: 90,
    }} onClick={onSelect}>
      {weapon ? (
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          {/* Weapon icon placeholder */}
          <div style={{
            width:56, height:56, flexShrink:0, borderRadius:8,
            background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem',
          }}>🗡</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700 }}>{weapon.name}</span>
              <span className={`rarity-${weapon.rarity}`} style={{ fontSize:'0.75rem' }}>{weapon.rarity}</span>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:6, alignItems:'center' }}>
              <ElementBadge element={weapon.element} />
              <span style={{ fontSize:'0.7rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                ATK {weapon.base_atk} · HP {weapon.base_hp}
              </span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {weapon.skills.map((sk,i) => (
                <span key={i} style={{
                  fontSize:'0.65rem', fontFamily:'var(--font-mono)',
                  padding:'2px 8px', borderRadius:20,
                  background:'rgba(255,255,255,0.05)',
                  border:`1px solid ${SKILL_CLR[sk.skill_type]||'var(--border-dim)'}`,
                  color: SKILL_CLR[sk.skill_type]||'var(--text-mid)',
                }}>{SKILL_LABEL[sk.skill_type]||sk.skill_type} +{skillMag(sk)}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:60,
          color: selected?'var(--charge-blue)':'var(--text-dim)', fontSize:'0.8rem' }}>
          {selected ? '← Click a weapon to assign' : '+ Main Weapon Slot'}
        </div>
      )}
      {weapon && (
        <button className="btn btn-danger"
          style={{ position:'absolute', top:8, right:8, padding:'2px 8px', fontSize:'0.6rem', minHeight:'unset' }}
          onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
      )}
    </div>
  );
}

// ── SUB WEAPON SLOT ──────────────────────────────────────────────────────────
function SubWeaponSlot({ slot, weapon, selected, onSelect, onClear, skillMag }) {
  return (
    <div style={{
      border: `1px solid ${selected?'var(--border-bright)':weapon?'var(--border-mid)':'var(--border-dim)'}`,
      borderRadius: 9,
      padding: '9px 10px',
      cursor: 'pointer',
      background: selected ? 'rgba(32,96,200,0.12)' : weapon ? 'rgba(255,255,255,0.02)' : 'transparent',
      minHeight: 74,
      transition: 'all 0.15s',
      position: 'relative',
      userSelect: 'none',
    }} onClick={onSelect}>
      {weapon ? (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:700, paddingRight:16, lineHeight:1.3 }}>
              {weapon.name}
            </span>
          </div>
          <div style={{ marginBottom:4 }}><ElementBadge element={weapon.element} /></div>
          {weapon.skills.slice(0,2).map((sk,i) => (
            <div key={i} style={{ fontSize:'0.56rem', color: SKILL_CLR[sk.skill_type]||'var(--text-dim)', fontFamily:'var(--font-mono)', marginTop:2 }}>
              {SKILL_LABEL[sk.skill_type]} +{skillMag(sk)}
            </div>
          ))}
          <button className="btn btn-danger"
            style={{ position:'absolute', top:5, right:5, padding:'1px 5px', fontSize:'0.55rem', minHeight:'unset' }}
            onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
          <span className={`rarity-${weapon.rarity}`} style={{ position:'absolute', bottom:5, right:7, fontSize:'0.55rem', fontFamily:'var(--font-mono)' }}>
            {weapon.rarity}
          </span>
        </>
      ) : (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:40,
          color: selected?'var(--charge-blue)':'var(--text-dim)', fontSize:'0.7rem', flexDirection:'column', gap:3 }}>
          <span style={{ fontSize:'1rem', opacity:0.3 }}>+</span>
          <span style={{ fontSize:'0.55rem' }}>{selected ? 'pick weapon' : `slot ${slot}`}</span>
        </div>
      )}
    </div>
  );
}
