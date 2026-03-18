import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge, formatNumber } from '../../lib/ui.jsx';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const TYPE_ICON  = { ATTACK:'⚔', DEFENSE:'🛡', HEAL:'💚', BALANCE:'⚖' };
const TYPE_COLOR = { ATTACK:'var(--hp-red)', DEFENSE:'var(--charge-blue)', HEAL:'var(--hp-green)', BALANCE:'var(--text-gold)' };
const RARITY_STARS = { SSR:'★★★', SR:'★★', R:'★' };
const SKILL_LABEL = { ATK_NORMAL:'Normal', ATK_OMEGA:'Omega', ATK_EX:'EX', HP_BOOST:'HP+', CRITICAL_RATE:'Crit', CHARGE_SPEED:'Spd', STAMINA:'Stam', ENMITY:'Enmity', DMG_CAP:'Cap' };
const SKILL_CLR   = { ATK_OMEGA:'var(--charge-blue)', ATK_EX:'var(--text-gold)', ATK_NORMAL:'var(--text-mid)', STAMINA:'var(--hp-green)', ENMITY:'var(--hp-red)', CRITICAL_RATE:'var(--crit-orange)' };

const ELEM_EMOJI = { FIRE:'🔥', WATER:'💧', EARTH:'🌍', WIND:'🌀', LIGHT:'☀', DARK:'🌑' };

function skillMag(sk) {
  return ((sk.magnitude_base + (sk.skill_level - 1) * sk.magnitude_per_level) * 100).toFixed(1) + '%';
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export function PartyPage() {
  const {
    catalog_characters, catalog_weapons, loadCatalog,
    party_character_ids, setPartyCharacters,
    grid_weapon_ids, setGridWeapon, clearGridSlot,
    grid_stats, calculateGridStats,
    setScreen,
  } = useGameStore();

  const [active_tab, setActiveTab] = useState('character'); // character | weapon | summon
  const [slot_picker, setSlotPicker] = useState(null);      // which party slot is being picked
  const [weapon_slot, setWeaponSlot] = useState(null);      // which weapon slot is being picked
  const [filter_elem, setFilterElem] = useState('ALL');
  const [detail_char, setDetailChar] = useState(null);

  useEffect(() => { loadCatalog(); calculateGridStats(); }, []);
  useEffect(() => { calculateGridStats(); }, [grid_weapon_ids]);

  const main_ids  = party_character_ids.filter(Boolean);
  const getChar   = id => catalog_characters.find(c => c.id === id);
  const getWeapon = id => catalog_weapons.find(w => w.id === id);
  const main_weapon = getWeapon(grid_weapon_ids[0]);

  const toggleChar = id => {
    if (main_ids.includes(id)) {
      setPartyCharacters(main_ids.filter(x => x !== id));
      if (detail_char?.id === id) setDetailChar(null);
    } else if (main_ids.length < 3) {
      setPartyCharacters([...main_ids, id]);
    }
    setSlotPicker(null);
  };

  const assignWeapon = id => {
    if (weapon_slot !== null) {
      setGridWeapon(weapon_slot, id);
      setWeaponSlot(null);
    }
  };

  // Compute party totals for MC banner
  const total_hp  = main_ids.reduce((s, id) => s + (getChar(id)?.base_hp || 0), 0)
                  + (grid_stats?.grid_hp || 0);
  const total_atk = main_ids.reduce((s, id) => s + (getChar(id)?.base_atk || 0), 0)
                  + (grid_stats?.grid_atk || 0);

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg-void)', overflow:'hidden' }}>

      {/* ── ZONE 1: MC BANNER ── */}
      <MCBanner
        total_hp={total_hp}
        total_atk={total_atk}
        main_element={main_weapon?.element}
        party_complete={main_ids.length === 3}
        onBack={() => setScreen('lobby')}
      />

      {/* ── ZONE 2: TAB BAR ── */}
      <TabBar active={active_tab} onChange={tab => {
        setActiveTab(tab);
        setSlotPicker(null);
        setWeaponSlot(null);
      }} />

      {/* ── ZONE 3: DYNAMIC CONTENT ── */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>

        {active_tab === 'character' && (
          <CharacterTab
            main_ids={main_ids}
            getChar={getChar}
            catalog_characters={catalog_characters}
            slot_picker={slot_picker}
            detail_char={detail_char}
            onSlotTap={i => setSlotPicker(slot_picker === i ? null : i)}
            onToggleChar={toggleChar}
            onDetailChar={c => setDetailChar(detail_char?.id === c.id ? null : c)}
            onCloseDetail={() => setDetailChar(null)}
          />
        )}

        {active_tab === 'weapon' && (
          <WeaponTab
            grid_weapon_ids={grid_weapon_ids}
            getWeapon={getWeapon}
            catalog_weapons={catalog_weapons}
            weapon_slot={weapon_slot}
            filter_elem={filter_elem}
            grid_stats={grid_stats}
            onSlotTap={slot => setWeaponSlot(weapon_slot === slot ? null : slot)}
            onAssignWeapon={assignWeapon}
            onClearSlot={slot => { clearGridSlot(slot); setWeaponSlot(null); }}
            onFilterElem={setFilterElem}
          />
        )}

        {active_tab === 'summon' && (
          <SummonTab />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav
        ally_count={main_ids.length}
        weapon_count={grid_weapon_ids.filter(Boolean).length}
        onBack={() => setScreen('lobby')}
        onConfirm={() => setScreen('lobby')}
      />
    </div>
  );
}

// ── MC BANNER ─────────────────────────────────────────────────────────────────
function MCBanner({ total_hp, total_atk, main_element, party_complete, onBack }) {
  return (
    <div style={{
      position:'relative', flexShrink:0,
      background:'linear-gradient(135deg,#0a1828 0%,#0c1e38 50%,#080e1c 100%)',
      borderBottom:'1px solid var(--border-dim)',
      overflow:'hidden', minHeight:130,
    }}>
      {/* Decorative gradient sweep */}
      <div style={{
        position:'absolute', inset:0, opacity:0.4,
        background:'radial-gradient(ellipse 70% 100% at 30% 50%, rgba(240,192,96,0.15) 0%, transparent 70%)',
        pointerEvents:'none',
      }} />

      <div style={{ position:'relative', display:'flex', padding:'10px 14px', gap:12 }}>
        {/* Left: MC portrait placeholder */}
        <div style={{
          width:88, height:110, flexShrink:0, borderRadius:10,
          background:'linear-gradient(160deg,rgba(120,80,0,0.5),rgba(40,20,0,0.7))',
          border:'1px solid var(--gold-dim)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
          padding:'6px 4px', overflow:'hidden', position:'relative',
        }}>
          {/* MC art placeholder */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.8rem', opacity:0.25 }}>⚔</div>
          {/* Class icon */}
          <div style={{
            position:'absolute', top:6, left:6,
            width:26, height:26, borderRadius:'50%',
            background:'rgba(0,0,0,0.6)', border:'1px solid var(--gold-dim)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem',
          }}>⚔</div>
          <div style={{ fontSize:'0.55rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', textAlign:'center', background:'rgba(0,0,0,0.6)', borderRadius:4, padding:'1px 4px', position:'relative', zIndex:1 }}>
            Fighter
          </div>
          {/* Element badge */}
          {main_element && (
            <div style={{
              position:'absolute', bottom:24, right:4,
              fontSize:'0.9rem', filter:'drop-shadow(0 0 4px rgba(0,0,0,0.8))',
            }}>
              {ELEM_EMOJI[main_element]}
            </div>
          )}
        </div>

        {/* Right: stats */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {/* Top row: slot label + switch */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-gold)', fontFamily:'var(--font-display)', fontWeight:700 }}>
                Sky-Wanderer
              </div>
              <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                Fighter · Lvl 1
              </div>
            </div>
            {party_complete && (
              <div style={{
                fontSize:'0.62rem', color:'#60cc60', fontFamily:'var(--font-mono)',
                background:'rgba(50,180,50,0.15)', border:'1px solid rgba(50,180,50,0.4)',
                padding:'2px 8px', borderRadius:20, fontWeight:700,
              }}>✓ Complete</div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:3, marginTop:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'0.65rem', color:'#60cc60', fontFamily:'var(--font-mono)', width:36 }}>♦ HP</span>
              <span style={{ fontSize:'1rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                {total_hp.toLocaleString()}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'0.65rem', color:'#ff9020', fontFamily:'var(--font-mono)', width:36 }}>✦ ATK</span>
              <span style={{ fontSize:'1rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                {total_atk.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Grid multipliers quick view */}
        </div>
      </div>
    </div>
  );
}

// ── TAB BAR ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id:'character', icon:'👤', label:'Character' },
    { id:'weapon',    icon:'⚔', label:'Weapon'    },
    { id:'summon',    icon:'💎', label:'Summon'    },
  ];
  return (
    <div style={{
      display:'flex', background:'var(--bg-panel)',
      borderBottom:'1px solid var(--border-dim)', flexShrink:0,
    }}>
      {tabs.map(tab => {
        const is_active = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{
            flex:1, padding:'10px 8px', border:'none', cursor:'pointer',
            background: is_active ? 'rgba(32,96,200,0.15)' : 'transparent',
            borderBottom: `2px solid ${is_active ? 'var(--charge-blue)' : 'transparent'}`,
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            transition:'all 0.15s',
          }}>
            <span style={{ fontSize:'1.1rem' }}>{tab.icon}</span>
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.68rem', fontWeight:700,
              letterSpacing:'0.04em', color: is_active ? 'var(--text-bright)' : 'var(--text-dim)',
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── TAB A: CHARACTER ──────────────────────────────────────────────────────────
function CharacterTab({ main_ids, getChar, catalog_characters, slot_picker, detail_char, onSlotTap, onToggleChar, onDetailChar, onCloseDetail }) {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Party slots + roster scroll together */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>

        {/* MAIN MEMBERS label */}
        <div style={{ textAlign:'center', marginBottom:10 }}>
          <span style={{
            display:'inline-block', padding:'3px 20px',
            background:'linear-gradient(90deg,transparent,rgba(240,192,96,0.12),transparent)',
            borderTop:'1px solid var(--gold-dim)', borderBottom:'1px solid var(--gold-dim)',
            fontSize:'0.62rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', letterSpacing:'0.12em',
          }}>MAIN MEMBERS</span>
        </div>

        {/* 3 main slots */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[0,1,2].map(i => {
            const char = getChar(main_ids[i]);
            const is_open = slot_picker === i;
            return (
              <PartySlotCard
                key={i}
                index={i}
                char={char}
                is_open={is_open}
                onTap={() => onSlotTap(i)}
              />
            );
          })}
        </div>

        {/* SUB MEMBERS — future */}
        <div style={{ textAlign:'center', marginBottom:8 }}>
          <span style={{
            display:'inline-block', padding:'3px 20px',
            background:'linear-gradient(90deg,transparent,rgba(100,100,100,0.08),transparent)',
            borderTop:'1px solid var(--border-dim)', borderBottom:'1px solid var(--border-dim)',
            fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.12em',
          }}>SUB MEMBERS · v2.0</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:18, opacity:0.4 }}>
          {[0,1].map(i => (
            <div key={i} style={{
              border:'1px dashed var(--border-dim)', borderRadius:10,
              padding:12, minHeight:70, display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>Sub Slot {i+1}</span>
            </div>
          ))}
        </div>

        {/* ROSTER */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:8 }}>
            CHARACTER ROSTER
            {slot_picker !== null && (
              <span style={{ color:'var(--gold-bright)', marginLeft:8 }}>
                ▶ Tap to assign to Slot {slot_picker + 1}
              </span>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
            {catalog_characters.map(char => {
              const selected = main_ids.includes(char.id);
              const full     = main_ids.length >= 3 && !selected;
              const expanded = detail_char?.id === char.id;
              return (
                <RosterCard
                  key={char.id}
                  char={char}
                  selected={selected}
                  disabled={full && slot_picker === null}
                  expanded={expanded}
                  slot_picker={slot_picker}
                  onToggle={() => onToggleChar(char.id)}
                  onExpand={() => onDetailChar(char)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PartySlotCard({ index, char, is_open, onTap }) {
  const hp_pct = char ? (char.base_hp / 20000) : 0;
  return (
    <div
      onClick={onTap}
      style={{
        background: char ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${is_open ? 'var(--border-bright)' : char ? 'var(--border-mid)' : 'var(--border-dim)'}`,
        borderRadius:10, cursor:'pointer', transition:'all 0.15s', overflow:'hidden',
        boxShadow: is_open ? '0 0 16px rgba(100,160,255,0.3)' : 'none',
        minHeight:140,
      }}
    >
      {char ? (
        <>
          {/* Portrait placeholder with element colour wash */}
          <div style={{
            height:80, display:'flex', alignItems:'center', justifyContent:'center',
            background:`linear-gradient(160deg,rgba(${char.element==='FIRE'?'255,80,32':char.element==='WATER'?'48,180,255':char.element==='EARTH'?'136,204,68':char.element==='WIND'?'160,255,176':char.element==='LIGHT'?'255,232,96':'192,96,255'},0.18) 0%,transparent 100%)`,
            position:'relative',
          }}>
            {/* SSR badge */}
            <div style={{
              position:'absolute', top:5, right:5,
              fontSize:'0.58rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'#ffcc00',
              background:'rgba(0,0,0,0.6)', padding:'1px 5px', borderRadius:3,
            }}>SSR</div>
            {/* Role icon */}
            <div style={{ fontSize:'2rem' }}>{TYPE_ICON[char.type]}</div>
          </div>

          <div style={{ padding:'8px 10px' }}>
            {/* Role label */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <span style={{ fontSize:'0.6rem', color:TYPE_COLOR[char.type], fontFamily:'var(--font-mono)', fontWeight:700 }}>
                {char.type}
              </span>
              <ElementBadge element={char.element} />
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'0.82rem', fontWeight:700, marginBottom:4 }}>
              {char.name}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <div style={{ fontSize:'0.65rem', fontFamily:'var(--font-mono)', color:'#60cc60' }}>
                ♦ {char.base_hp.toLocaleString()}
              </div>
              <div style={{ fontSize:'0.65rem', fontFamily:'var(--font-mono)', color:'#ff9020' }}>
                ✦ {char.base_atk.toLocaleString()}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ height:'100%', minHeight:140, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
          <div style={{ fontSize:'1.6rem', opacity:0.2 }}>+</div>
          <div style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
            {is_open ? 'Pick from roster' : `Slot ${index + 1}`}
          </div>
        </div>
      )}
    </div>
  );
}

function RosterCard({ char, selected, disabled, expanded, slot_picker, onToggle, onExpand }) {
  return (
    <div style={{
      background:'var(--bg-panel)', borderRadius:10,
      border:`1px solid ${selected ? 'var(--border-bright)' : 'var(--border-dim)'}`,
      opacity: disabled ? 0.5 : 1,
      boxShadow: selected ? '0 0 16px rgba(64,144,255,0.18)' : 'none',
      transition:'all 0.15s', overflow:'hidden',
    }}>
      {/* Card header row */}
      <div style={{ display:'flex', gap:10, padding:'10px 12px', alignItems:'flex-start' }}>
        {/* Mini portrait */}
        <div style={{
          width:44, height:44, flexShrink:0, borderRadius:8,
          background:`linear-gradient(135deg,rgba(${char.element==='FIRE'?'255,80,32':char.element==='WATER'?'48,180,255':char.element==='EARTH'?'136,204,68':char.element==='WIND'?'160,255,176':'200,200,200'},0.25),transparent)`,
          border:'1px solid var(--border-dim)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0,
        }}>{TYPE_ICON[char.type]}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:700 }}>{char.name}</span>
            <span style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontStyle:'italic' }}>{char.title}</span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
            <ElementBadge element={char.element} />
            <span style={{ fontSize:'0.65rem', color:TYPE_COLOR[char.type], fontFamily:'var(--font-mono)', fontWeight:700 }}>{char.type}</span>
          </div>
          <div style={{ display:'flex', gap:12, fontSize:'0.65rem', fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'#60cc60' }}>♦ {char.base_hp.toLocaleString()}</span>
            <span style={{ color:'#ff9020' }}>✦ {char.base_atk.toLocaleString()}</span>
            <span style={{ color:'var(--charge-blue)' }}>+{char.charge_gain_per_turn}/t</span>
          </div>
        </div>
      </div>

      {/* Ability tags */}
      <div style={{ padding:'0 12px 8px', display:'flex', gap:4, flexWrap:'wrap' }}>
        {char.abilities.map(a => (
          <span key={a.id} style={{
            fontSize:'0.6rem', fontFamily:'var(--font-mono)',
            padding:'2px 8px', borderRadius:20,
            background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)',
            color:'var(--text-mid)',
          }}>{a.name}</span>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:'8px 12px 12px', borderTop:'1px solid var(--border-dim)', background:'rgba(0,0,0,0.2)' }}>
          {char.abilities.map(a => (
            <div key={a.id} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', fontWeight:700, color:'var(--text-bright)' }}>{a.name}</span>
                <span style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>CD {a.cooldown_max}t</span>
              </div>
              <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', lineHeight:1.5 }}>{a.description}</div>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--border-dim)', paddingTop:8, marginTop:4 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'0.72rem', color:'var(--text-gold)', marginBottom:2 }}>
              CA: {char.charge_attack.name}
            </div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-dim)', lineHeight:1.5 }}>{char.charge_attack.description}</div>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div style={{ padding:'0 10px 10px', display:'flex', gap:6 }}>
        {selected ? (
          <button className="btn btn-danger btn-sm" style={{ flex:1 }}
            onClick={e => { e.stopPropagation(); onToggle(); }}>
            Remove
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" style={{ flex:1 }}
            disabled={disabled}
            onClick={e => { e.stopPropagation(); if (!disabled) onToggle(); }}>
            {slot_picker !== null ? `→ Slot ${slot_picker + 1}` : 'Add'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" style={{ padding:'6px 10px' }}
          onClick={e => { e.stopPropagation(); onExpand(); }}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>
    </div>
  );
}

// ── TAB B: WEAPON ─────────────────────────────────────────────────────────────
function WeaponTab({ grid_weapon_ids, getWeapon, catalog_weapons, weapon_slot, filter_elem, grid_stats, onSlotTap, onAssignWeapon, onClearSlot, onFilterElem }) {
  const main_weapon = getWeapon(grid_weapon_ids[0]);
  const filtered    = catalog_weapons.filter(w => filter_elem === 'ALL' || w.element === filter_elem);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Total HP/ATK bar */}
      {grid_stats && (
        <div style={{
          background:'var(--bg-deep)', borderBottom:'1px solid var(--border-dim)',
          padding:'8px 14px', display:'flex', gap:20, flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:'0.65rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦ Total HP</span>
            <span style={{ fontSize:'1rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700 }}>
              {grid_stats.grid_hp.toLocaleString()}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:'0.65rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦ Total ATK</span>
            <span style={{ fontSize:'1rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight:700 }}>
              {grid_stats.grid_atk.toLocaleString()}
            </span>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            {[
              ['N×', grid_stats.normal_mult.toFixed(2),'var(--text-bright)'],
              ['Ω×', grid_stats.omega_mult.toFixed(2), 'var(--charge-blue)'],
              ['EX×', grid_stats.ex_mult.toFixed(2),  'var(--text-gold)'],
            ].map(([l,v,c]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'0.55rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>{l}</div>
                <div style={{ fontSize:'0.78rem', color:c, fontFamily:'var(--font-mono)', fontWeight:700 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main body: weapon grid + picker side by side on desktop, stacked on mobile */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns: weapon_slot !== null ? '1fr 1fr' : '1fr', transition:'all 0.2s' }}>

          {/* Weapon grid */}
          <div style={{ overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>

            {/* Main weapon slot — tall, prominent */}
            <div>
              <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
                MAIN WEAPON · sets MC element &amp; charge attack
              </div>
              <MainWeaponSlot
                weapon={main_weapon}
                selected={weapon_slot === 0}
                onTap={() => onSlotTap(0)}
                onClear={() => onClearSlot(0)}
              />
            </div>

            {/* 3×3 sub grid */}
            <div>
              <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
                SUB WEAPONS · all skills always active
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[1,2,3,4,5,6,7,8,9].map(slot => (
                  <SubWeaponSlot
                    key={slot}
                    slot={slot}
                    weapon={getWeapon(grid_weapon_ids[slot])}
                    selected={weapon_slot === slot}
                    onTap={() => onSlotTap(slot)}
                    onClear={() => onClearSlot(slot)}
                  />
                ))}
              </div>
            </div>

            {/* Grid stats summary */}
            {grid_stats && (
              <div className="panel" style={{ padding:12 }}>
                <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:8 }}>
                  GRID STATS
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:8 }}>
                  {[
                    ['Normal ×', grid_stats.normal_mult.toFixed(3), 'var(--text-bright)'],
                    ['Omega ×',  grid_stats.omega_mult.toFixed(3),  'var(--charge-blue)'],
                    ['EX ×',     grid_stats.ex_mult.toFixed(3),     'var(--text-gold)'],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-mid)', borderRadius:7, padding:'7px 8px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.55rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', fontWeight:700, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
                  {[['ATK', grid_stats.grid_atk?.toLocaleString()], ['HP', grid_stats.grid_hp?.toLocaleString()], ['Crit', (grid_stats.crit_rate*100).toFixed(1)+'%'], ['Spd', grid_stats.charge_speed_bonus?(grid_stats.charge_speed_bonus*100).toFixed(0)+'%':'0%']].map(([l,v]) => (
                    <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-dim)', borderRadius:6, padding:'6px 7px' }}>
                      <div style={{ fontSize:'0.55rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text-bright)', fontWeight:700 }}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:8, fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', lineHeight:1.5 }}>
                  DMG = ATK × {grid_stats.normal_mult.toFixed(2)} × {grid_stats.omega_mult.toFixed(2)} × {grid_stats.ex_mult.toFixed(2)} × Elem × Crit − DEF
                </div>
              </div>
            )}
          </div>

          {/* Weapon picker panel — appears when a slot is selected */}
          {weapon_slot !== null && (
            <div style={{ borderLeft:'1px solid var(--border-dim)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-dim)', flexShrink:0 }}>
                <div style={{ fontSize:'0.65rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)', fontWeight:700, marginBottom:8 }}>
                  ▶ Slot {weapon_slot}{weapon_slot===0?' (Main)':''} — pick weapon
                </div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {['ALL','FIRE','WATER','EARTH','WIND','LIGHT','DARK'].map(e => (
                    <button key={e} className="btn btn-ghost btn-sm"
                      style={{ padding:'3px 7px', fontSize:'0.58rem',
                        borderColor: filter_elem===e?'var(--border-bright)':undefined,
                        color: filter_elem===e?'var(--text-bright)':undefined,
                        background: filter_elem===e?'rgba(32,96,200,0.12)':undefined,
                      }}
                      onClick={() => onFilterElem(e)}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                {filtered.map(w => {
                  const in_grid = grid_weapon_ids.includes(w.id);
                  return (
                    <WeaponPickerCard
                      key={w.id}
                      weapon={w}
                      in_grid={in_grid}
                      onPick={() => !in_grid && onAssignWeapon(w.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MainWeaponSlot({ weapon, selected, onTap, onClear }) {
  return (
    <div onClick={onTap} style={{
      border:`2px solid ${selected?'var(--border-bright)':weapon?'var(--gold-dim)':'var(--border-dim)'}`,
      borderRadius:12, cursor:'pointer', transition:'all 0.15s', position:'relative',
      background: selected ? 'rgba(32,96,200,0.12)' : weapon ? 'linear-gradient(135deg,rgba(120,88,0,0.12),rgba(60,40,0,0.06))' : 'transparent',
      display:'flex', gap:12, padding:14, alignItems:'center',
    }}>
      {/* Art placeholder */}
      <div style={{
        width:52, height:68, flexShrink:0, borderRadius:8,
        background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-dim)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', position:'relative',
      }}>
        {weapon ? '🗡' : <span style={{ fontSize:'1.5rem', opacity:0.2 }}>+</span>}
        {weapon && (
          <div style={{
            position:'absolute', bottom:2, left:2, right:2, textAlign:'center',
            fontSize:'0.48rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
            background:'rgba(0,0,0,0.7)', borderRadius:3, padding:'1px 0',
          }}>Skin</div>
        )}
      </div>

      {weapon ? (
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:700 }}>{weapon.name}</div>
            <span className={`rarity-${weapon.rarity}`} style={{ fontSize:'0.7rem', fontFamily:'var(--font-mono)' }}>{weapon.rarity}</span>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:5, alignItems:'center' }}>
            <ElementBadge element={weapon.element} />
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:5 }}>
            <span style={{ fontSize:'0.68rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦ {weapon.base_hp}</span>
            <span style={{ fontSize:'0.68rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦ {weapon.base_atk}</span>
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {weapon.skills.map((sk,i) => (
              <span key={i} style={{
                fontSize:'0.6rem', fontFamily:'var(--font-mono)', padding:'2px 7px', borderRadius:20,
                background:'rgba(255,255,255,0.05)', border:`1px solid ${SKILL_CLR[sk.skill_type]||'var(--border-dim)'}`,
                color: SKILL_CLR[sk.skill_type]||'var(--text-mid)',
              }}>{SKILL_LABEL[sk.skill_type]||sk.skill_type} +{skillMag(sk)}</span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color:'var(--text-dim)', fontSize:'0.8rem' }}>
          {selected ? '← Pick from weapon list' : 'Tap to set Main Weapon'}
        </div>
      )}

      {weapon && (
        <button className="btn btn-danger" style={{ position:'absolute', top:6, right:6, padding:'2px 7px', fontSize:'0.6rem', minHeight:'unset' }}
          onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
      )}
    </div>
  );
}

function SubWeaponSlot({ slot, weapon, selected, onTap, onClear }) {
  return (
    <div onClick={onTap} style={{
      border:`1px solid ${selected?'var(--border-bright)':weapon?'var(--border-mid)':'var(--border-dim)'}`,
      borderRadius:9, cursor:'pointer', transition:'all 0.12s', position:'relative',
      background: selected ? 'rgba(32,96,200,0.12)' : weapon ? 'rgba(255,255,255,0.02)' : 'transparent',
      minHeight:72, padding:'8px 8px 6px', userSelect:'none',
    }}>
      {weapon ? (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.68rem', fontWeight:700, paddingRight:14, lineHeight:1.3 }}>{weapon.name}</span>
          </div>
          <ElementBadge element={weapon.element} />
          <div style={{ display:'flex', gap:5, marginTop:3 }}>
            <span style={{ fontSize:'0.58rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦{weapon.base_hp}</span>
            <span style={{ fontSize:'0.58rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦{weapon.base_atk}</span>
          </div>
          {weapon.skills.slice(0,1).map((sk,i) => (
            <div key={i} style={{ fontSize:'0.53rem', color:SKILL_CLR[sk.skill_type]||'var(--text-dim)', fontFamily:'var(--font-mono)', marginTop:2 }}>
              {SKILL_LABEL[sk.skill_type]} +{skillMag(sk)}
            </div>
          ))}
          <span className={`rarity-${weapon.rarity}`} style={{ position:'absolute', top:5, right:22, fontSize:'0.52rem', fontFamily:'var(--font-mono)' }}>
            {weapon.rarity}
          </span>
          <button className="btn btn-danger" style={{ position:'absolute', top:4, right:4, padding:'1px 4px', fontSize:'0.5rem', minHeight:'unset' }}
            onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
        </>
      ) : (
        <div style={{ height:'100%', minHeight:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
          <span style={{ fontSize:'1rem', opacity:0.2 }}>+</span>
          <span style={{ fontSize:'0.52rem', color: selected?'var(--charge-blue)':'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
            {selected ? 'pick' : slot}
          </span>
        </div>
      )}
    </div>
  );
}

function WeaponPickerCard({ weapon, in_grid, onPick }) {
  return (
    <div style={{
      background:'var(--bg-card)', borderRadius:8,
      border:`1px solid ${in_grid?'var(--border-dim)':'var(--border-dim)'}`,
      padding:'8px 10px', cursor: in_grid?'default':'pointer',
      opacity: in_grid ? 0.4 : 1, transition:'all 0.12s',
    }}
      onClick={onPick}
      onMouseEnter={e => { if(!in_grid) e.currentTarget.style.borderColor='var(--border-bright)'; }}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-dim)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'0.8rem', fontWeight:700 }}>{weapon.name}</span>
        <span className={`rarity-${weapon.rarity}`} style={{ fontSize:'0.65rem', fontFamily:'var(--font-mono)' }}>{RARITY_STARS[weapon.rarity]} {weapon.rarity}</span>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:4, alignItems:'center' }}>
        <ElementBadge element={weapon.element} />
        <span style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>✦{weapon.base_atk} ♦{weapon.base_hp}</span>
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {weapon.skills.map((sk,i) => (
          <span key={i} style={{
            fontSize:'0.58rem', fontFamily:'var(--font-mono)', padding:'1px 6px', borderRadius:20,
            background:'rgba(255,255,255,0.04)', border:`1px solid ${SKILL_CLR[sk.skill_type]||'var(--border-dim)'}`,
            color: SKILL_CLR[sk.skill_type]||'var(--text-mid)',
          }}>{SKILL_LABEL[sk.skill_type]||sk.skill_type} +{skillMag(sk)}</span>
        ))}
      </div>
      {in_grid && <div style={{ fontSize:'0.58rem', color:'var(--gold-dim)', marginTop:3, fontFamily:'var(--font-mono)' }}>✓ In grid</div>}
    </div>
  );
}

// ── TAB C: SUMMON ─────────────────────────────────────────────────────────────
function SummonTab() {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24 }}>
      <div style={{ fontSize:'3rem', opacity:0.3 }}>💎</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--text-dim)', textAlign:'center' }}>
        Summon Grid
      </div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-dim)', fontStyle:'italic', textAlign:'center', maxWidth:300, lineHeight:1.6 }}>
        Summons provide passive aura bonuses to your party.<br/>
        Main summon can be called once in battle for a powerful active effect.
      </div>
      <div style={{
        padding:'8px 20px', borderRadius:20,
        background:'rgba(100,100,100,0.1)', border:'1px solid var(--border-dim)',
        fontSize:'0.72rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
      }}>Coming in v2.0</div>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ ally_count, weapon_count, onBack, onConfirm }) {
  return (
    <div style={{
      background:'var(--bg-panel)', borderTop:'1px solid var(--border-dim)',
      padding:'8px 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0,
    }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>

      {/* Resource counters */}
      <div style={{ display:'flex', gap:6, marginLeft:6 }}>
        <div style={{
          padding:'3px 10px', borderRadius:20, fontSize:'0.65rem', fontFamily:'var(--font-mono)',
          background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)',
          color:'var(--text-mid)',
        }}>👤 {ally_count}/3</div>
        <div style={{
          padding:'3px 10px', borderRadius:20, fontSize:'0.65rem', fontFamily:'var(--font-mono)',
          background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)',
          color:'var(--text-mid)',
        }}>🗡 {weapon_count}/10</div>
      </div>

      <button className="btn btn-gold btn-sm" style={{ marginLeft:'auto', padding:'6px 18px' }} onClick={onConfirm}>
        ✓ Done
      </button>
    </div>
  );
}
