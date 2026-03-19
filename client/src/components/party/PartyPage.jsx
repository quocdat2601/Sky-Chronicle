import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge } from '../../lib/ui.jsx';
import WeaponSkillIcon, { WeaponSkillRow } from './WeaponSkillIcon.jsx';
// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const TYPE_ICON  = { ATTACK:'⚔', DEFENSE:'🛡', HEAL:'💚', BALANCE:'⚖' };
const TYPE_COLOR = { ATTACK:'var(--hp-red)', DEFENSE:'var(--charge-blue)', HEAL:'var(--hp-green)', BALANCE:'var(--text-gold)' };
const RARITY_STARS = { SSR:'★★★', SR:'★★', R:'★' };
const ELEM_EMOJI  = { FIRE:'🔥', WATER:'💧', EARTH:'🌍', WIND:'🌀', LIGHT:'☀', DARK:'🌑' };

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

  const [active_tab,   setActiveTab]   = useState('character');
  const [weapon_slot,  setWeaponSlot]  = useState(null);
  const [filter_elem,  setFilterElem]  = useState('ALL');
  const [auto_modal,   setAutoModal]   = useState(false); // Auto Select modal open

  // ── Slot swap state ─────────────────────────────────────────────────────────
  // selected_slot: index (0-2) of the header slot currently selected for swapping
  // When a slot is selected:
  //   - Clicking another header slot → swap those two positions
  //   - Clicking a roster char → replace that slot with the char
  //   - Clicking same slot again → deselect
  const [selected_slot, setSelectedSlot] = useState(null); // 0|1|2|null
  const [qc_staged,     setQcStaged]     = useState(null); // char id staged from roster

  useEffect(() => { loadCatalog(); calculateGridStats(); }, []);
  useEffect(() => { calculateGridStats(); }, [grid_weapon_ids]);

  const main_ids    = party_character_ids.filter(Boolean);
  const getChar     = id => catalog_characters.find(c => c.id === id);
  const getWeapon   = id => catalog_weapons.find(w => w.id === id);
  const main_weapon = getWeapon(grid_weapon_ids[0]);

  // ── Normal add/remove (no slot selected) ───────────────────────────────────
  const toggleChar = id => {
    if (selected_slot !== null) {
      // Replace selected_slot with this char
      assignCharToSlot(id, selected_slot);
      return;
    }
    if (main_ids.includes(id)) {
      setPartyCharacters(main_ids.filter(x => x !== id));
    } else if (main_ids.length < 3) {
      setPartyCharacters([...main_ids, id]);
    }
  };

  // ── Slot selection & swap ───────────────────────────────────────────────────
  const onHeaderSlotTap = slot_index => {
    if (selected_slot === slot_index) {
      // Deselect
      setSelectedSlot(null);
      setQcStaged(null);
      return;
    }
    if (selected_slot !== null) {
      // Swap the two slots
      const new_ids = [...Array(3)].map((_, i) => main_ids[i] || null);
      const tmp = new_ids[selected_slot];
      new_ids[selected_slot] = new_ids[slot_index] || null;
      new_ids[slot_index] = tmp;
      setPartyCharacters(new_ids.filter(Boolean));
      setSelectedSlot(null);
      return;
    }
    // Select this slot
    setSelectedSlot(slot_index);
  };

  // Assign a char from roster to a specific slot index
  const assignCharToSlot = (char_id, slot_index) => {
    const new_ids = [...Array(3)].map((_, i) => main_ids[i] || null);
    // Remove char from wherever it already is
    const existing = new_ids.indexOf(char_id);
    if (existing !== -1) new_ids[existing] = null;
    new_ids[slot_index] = char_id;
    setPartyCharacters(new_ids.filter(Boolean));
    setSelectedSlot(null);
    setQcStaged(null);
  };

  const clearSelection = () => { setSelectedSlot(null); setQcStaged(null); };

  const assignWeapon = id => {
    if (weapon_slot !== null) { setGridWeapon(weapon_slot, id); }
    // slot stays selected so user can keep browsing
  };

  // Auto-fill: sort by chosen stat, fill slots with matching element weapons
  const autoFillWeapons = (stat, element) => {
    const pool = catalog_weapons.filter(w => element === 'ALL' || w.element === element);
    // Sort by chosen stat descending
    const sorted = [...pool].sort((a, b) =>
      stat === 'ATK' ? b.base_atk - a.base_atk : b.base_hp - a.base_hp
    );
    // Build new 10-slot array: slot 0 = main, 1-9 = subs
    const new_ids = Array(10).fill(null);
    let pick_idx = 0;
    for (let slot = 0; slot < 10; slot++) {
      if (pick_idx < sorted.length) {
        new_ids[slot] = sorted[pick_idx].id;
        pick_idx++;
      }
      // else leave null (empty)
    }
    for (let i = 0; i < 10; i++) {
      if (new_ids[i]) setGridWeapon(i, new_ids[i]);
      else clearGridSlot(i);
    }
    setAutoModal(false);
  };

  // MC banner shows flat base stats: MC_base + grid contribution (no skill multipliers)
  // Skill multipliers are only applied in Estimated Damage panel and in raid combat
  const MC_BASE_ATK = 1890;
  const MC_BASE_HP  = 3060;
  const total_atk = MC_BASE_ATK + (grid_stats?.grid_atk || 0);
  const total_hp  = MC_BASE_HP  + (grid_stats?.grid_hp  || 0);

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg-void)', overflow:'hidden' }}>

      {/* ── ZONE 1: HEADER — MC + 3 main chars in one row ── */}
      <HeaderBanner
        main_ids={main_ids}
        getChar={getChar}
        total_hp={total_hp}
        total_atk={total_atk}
        main_element={main_weapon?.element}
        party_complete={main_ids.length === 3}
        grid_stats={grid_stats}
        selected_slot={selected_slot}
        onHeaderSlotTap={onHeaderSlotTap}
        onRemoveSlot={i => {
          const n = [...Array(3)].map((_,j) => main_ids[j]||null);
          n[i] = null;
          setPartyCharacters(n.filter(Boolean));
          if (selected_slot === i) setSelectedSlot(null);
        }}
      />

      {/* ── ZONE 2: TAB BAR ── */}
      <TabBar active={active_tab} onChange={tab => {
        setActiveTab(tab);
        setWeaponSlot(null);
        setSelectedSlot(null);
        setQcStaged(null);
      }} />

      {/* ── ZONE 3: CONTENT ── */}
      <div style={{ flex:1, overflow:'hidden' }}>
        {active_tab === 'character' && (
          <CharacterTab
            main_ids={main_ids}
            getChar={getChar}
            catalog_characters={catalog_characters}
            selected_slot={selected_slot}
            onToggleChar={toggleChar}
            onClearSelection={clearSelection}
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
            auto_modal={auto_modal}
            onSlotTap={slot => setWeaponSlot(weapon_slot === slot ? null : slot)}
            onAssignWeapon={assignWeapon}
            onClearSlot={slot => { clearGridSlot(slot); }}
            onFilterElem={setFilterElem}
            onOpenAutoModal={() => setAutoModal(true)}
            onCloseAutoModal={() => setAutoModal(false)}
            onAutoFill={autoFillWeapons}
          />
        )}
        {active_tab === 'summon' && <SummonTab />}
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

// ── HEADER BANNER — split 50/50: MC left, 3 ally slots right ────────────────
function HeaderBanner({ main_ids, getChar, total_hp, total_atk, main_element, party_complete,
                        grid_stats, selected_slot, onHeaderSlotTap, onRemoveSlot }) {
  const is_swap_mode = selected_slot !== null;

  // Pre-compute grid multipliers — mirrors raidManager / GBF wiki:
  // Teammate cards show flat base stats: char.base + grid contribution (no skill multipliers)
  // Same principle as MC card — skill multipliers shown only in Estimated Damage / raid
  const grid_atk    = grid_stats?.grid_atk || 0;
  const grid_hp_val = grid_stats?.grid_hp  || 0;

  const boostedAtk = (base) => base + grid_atk;
  const boostedHp  = (base) => base + grid_hp_val;

  return (
    <div style={{
      flexShrink:0,
      background:'linear-gradient(135deg,#071220 0%,#0b1a2e 60%,#060e1c 100%)',
      borderBottom:'1px solid var(--border-dim)',
    }}>
      {/* Two-column split */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:130 }}>

        {/* ── LEFT HALF: MC info ── */}
        <div style={{
          borderRight:'1px solid var(--border-dim)',
          padding:'10px 14px',
          display:'flex', gap:12, alignItems:'center',
          background:'linear-gradient(135deg,rgba(120,80,0,0.12) 0%,transparent 60%)',
        }}>
          {/* MC portrait */}
          <div style={{
            width:76, height:'100%', minHeight:100, flexShrink:0, borderRadius:10,
            position:'relative', overflow:'hidden',
            background:'linear-gradient(160deg,rgba(120,80,0,0.45),rgba(40,20,0,0.7))',
            border:'1px solid var(--gold-dim)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
            padding:'0 4px 6px',
          }}>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.6rem', opacity:0.18 }}>⚔</div>
            {main_element && (
              <div style={{ position:'absolute', top:6, right:6, fontSize:'0.9rem' }}>{ELEM_EMOJI[main_element]}</div>
            )}
            <div style={{ position:'relative', zIndex:1, fontSize:'0.5rem', color:'var(--gold-bright)', fontFamily:'var(--font-mono)',
              background:'rgba(0,0,0,0.7)', borderRadius:4, padding:'1px 6px', textAlign:'center' }}>
              Fighter
            </div>
          </div>

          {/* MC stats */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:700, color:'var(--text-gold)', marginBottom:1 }}>
              Sky-Wanderer
            </div>
            <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:8 }}>
              Fighter · Lvl 1
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'0.6rem', color:'#60cc60', fontFamily:'var(--font-mono)', width:28 }}>♦ HP</span>
                <span style={{ fontSize:'0.88rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                  {total_hp.toLocaleString()}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'0.6rem', color:'#ff9020', fontFamily:'var(--font-mono)', width:28 }}>✦ ATK</span>
                <span style={{ fontSize:'0.88rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                  {total_atk.toLocaleString()}
                </span>
              </div>
            </div>
            {party_complete && (
              <div style={{ marginTop:8, fontSize:'0.58rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700,
                background:'rgba(50,180,50,0.15)', border:'1px solid rgba(50,180,50,0.35)',
                padding:'2px 8px', borderRadius:20, display:'inline-block' }}>✓ Complete</div>
            )}
          </div>
        </div>

        {/* ── RIGHT HALF: 3 main ally slots ── */}
        <div style={{ padding:'10px 12px 10px 10px', display:'flex', flexDirection:'column', gap:0 }}>
          {/* Label */}
          <div style={{ fontSize:'0.55rem', color: is_swap_mode ? 'var(--charge-blue)' : 'var(--text-dim)',
            fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>
              {is_swap_mode
                ? `SLOT ${selected_slot+1} SELECTED — tap another slot to swap positions`
                : 'MAIN MEMBERS · tap to select & swap'}
            </span>
            {is_swap_mode && (
              <button onClick={() => onHeaderSlotTap(selected_slot)}
                style={{ fontSize:'0.55rem', color:'var(--text-dim)', background:'none', border:'none', cursor:'pointer', padding:'0 4px' }}>
                ✕ cancel
              </button>
            )}
          </div>

          {/* 3 slot cards in a row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, flex:1 }}>
            {[0,1,2].map(i => {
              const char = getChar(main_ids[i]);
              const is_selected = selected_slot === i;
              const is_swap_target = is_swap_mode && selected_slot !== i;
              const elem_rgb = char ? {
                FIRE:'255,80,32', WATER:'48,180,255', EARTH:'136,204,68',
                WIND:'160,255,176', LIGHT:'255,232,96', DARK:'192,96,255',
              }[char.element] || '200,200,200' : null;

              return (
                <div key={i}
                  onClick={() => onHeaderSlotTap(i)}
                  style={{
                    borderRadius:9, overflow:'hidden', position:'relative', cursor:'pointer',
                    border:`1px solid ${is_selected ? 'var(--charge-blue)' : is_swap_target ? 'rgba(100,200,255,0.5)' : char ? 'var(--border-mid)' : 'var(--border-dim)'}`,
                    background: is_selected
                      ? 'rgba(32,96,200,0.25)'
                      : is_swap_target
                        ? 'rgba(32,96,200,0.12)'
                        : char
                          ? `linear-gradient(160deg,rgba(${elem_rgb},0.18) 0%,transparent 80%)`
                          : 'rgba(255,255,255,0.02)',
                    padding:'6px 8px',
                    transition:'all 0.15s',
                    boxShadow: is_selected ? '0 0 12px rgba(64,144,255,0.4)' : is_swap_target ? '0 0 8px rgba(64,144,255,0.2)' : 'none',
                    display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:80,
                  }}
                >
                  {char ? (
                    <>
                      {/* Top: rarity + remove */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <span style={{ fontSize:'0.48rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'#ffcc00',
                          background:'rgba(0,0,0,0.55)', padding:'1px 4px', borderRadius:3 }}>SSR</span>
                        {!is_swap_mode && (
                          <button style={{ fontSize:'0.48rem', color:'var(--hp-red)', background:'rgba(0,0,0,0.55)',
                            border:'none', borderRadius:3, cursor:'pointer', padding:'1px 4px', lineHeight:1 }}
                            onClick={e => { e.stopPropagation(); onRemoveSlot(i); }}>✕</button>
                        )}
                      </div>
                      {/* Mid: name + type + element */}
                      <div>
                        <div style={{ fontSize:'0.65rem', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:2, lineHeight:1.2 }}>{char.name}</div>
                        <div style={{ display:'flex', gap:3, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontSize:'0.5rem', color:TYPE_COLOR[char.type], fontFamily:'var(--font-mono)', fontWeight:700 }}>{char.type}</span>
                          <ElementBadge element={char.element} />
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <span style={{ fontSize:'0.54rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦{boostedHp(char.base_hp).toLocaleString()}</span>
                          <span style={{ fontSize:'0.54rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦{boostedAtk(char.base_atk).toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Swap overlay when this is the target */}
                      {is_swap_target && (
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                          background:'rgba(32,96,200,0.22)', borderRadius:8, pointerEvents:'none' }}>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--charge-blue)', fontWeight:700 }}>
                            ⇄ swap
                          </span>
                        </div>
                      )}
                      {/* Selected indicator */}
                      {is_selected && (
                        <div style={{ position:'absolute', bottom:4, right:5, fontSize:'0.5rem',
                          color:'var(--charge-blue)', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                          selected
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:3 }}>
                      {is_swap_target ? (
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--charge-blue)', fontWeight:700 }}>→ move here</span>
                      ) : (
                        <>
                          <span style={{ fontSize:'1rem', opacity:0.2 }}>+</span>
                          <span style={{ fontSize:'0.52rem', color: is_selected?'var(--charge-blue)':'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                            {is_selected ? 'pick from roster' : 'Empty'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
    <div style={{ display:'flex', background:'var(--bg-panel)', borderBottom:'1px solid var(--border-dim)', flexShrink:0 }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex:1, padding:'9px 8px', border:'none', cursor:'pointer',
            background: on ? 'rgba(32,96,200,0.15)' : 'transparent',
            borderBottom:`2px solid ${on?'var(--charge-blue)':'transparent'}`,
            display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all 0.15s',
          }}>
            <span style={{ fontSize:'1rem' }}>{t.icon}</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.66rem', fontWeight:700, letterSpacing:'0.04em',
              color: on ? 'var(--text-bright)' : 'var(--text-dim)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── TAB A: CHARACTER ──────────────────────────────────────────────────────────
function CharacterTab({ main_ids, getChar, catalog_characters, selected_slot, onToggleChar, onClearSelection }) {
  const slot_pick_mode = selected_slot !== null;
  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'12px 14px' }}>
      {/* Roster label */}
      <div style={{ fontSize:'0.62rem', color: slot_pick_mode ? 'var(--charge-blue)' : 'var(--text-dim)',
        fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:10,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>
          {slot_pick_mode
            ? `SLOT ${selected_slot+1} — tap a character to place in this slot`
            : 'CHARACTER ROSTER · tap a card to add/remove · tap a header slot first to swap'
          }
        </span>
        {slot_pick_mode && (
          <button onClick={onClearSelection}
            style={{ fontSize:'0.58rem', color:'var(--text-dim)', background:'none', border:'none', cursor:'pointer' }}>
            cancel
          </button>
        )}
      </div>

      {/* Horizontal scrolling roster of cards */}
      <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8 }}>
        {catalog_characters.map(char => {
          const in_party   = main_ids.includes(char.id);
          const full       = main_ids.length >= 3 && !in_party;
          const disabled   = !slot_pick_mode && full;
          return (
            <RosterCard
              key={char.id}
              char={char}
              in_party={in_party}
              disabled={disabled}
              slot_pick_mode={slot_pick_mode}
              selected_slot={selected_slot}
              onToggle={() => onToggleChar(char.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function RosterCard({ char, in_party, disabled, slot_pick_mode, selected_slot, onToggle }) {
  const elem_color = {
    FIRE:'255,80,32', WATER:'48,180,255', EARTH:'136,204,68',
    WIND:'160,255,176', LIGHT:'255,232,96', DARK:'192,96,255',
  }[char.element] || '200,200,200';

  return (
    <div style={{
      width:280, flexShrink:0, borderRadius:12, overflow:'hidden',
      background:'var(--bg-panel)',
      border:`1px solid ${in_party ? 'var(--border-bright)' : 'var(--border-dim)'}`,
      opacity: disabled ? 0.45 : 1,
      boxShadow: in_party ? '0 0 14px rgba(64,144,255,0.18)' : 'none',
      transition:'all 0.15s',
    }}>
      {/* Card header */}
      <div style={{
        padding:'10px 12px 8px',
        background:`linear-gradient(135deg,rgba(${elem_color},0.15) 0%,transparent 70%)`,
        borderBottom:'1px solid var(--border-dim)',
        display:'flex', gap:10, alignItems:'flex-start',
      }}>
        {/* Portrait */}
        <div style={{
          width:48, height:48, flexShrink:0, borderRadius:9,
          background:`rgba(${elem_color},0.2)`, border:'1px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem',
        }}>{TYPE_ICON[char.type]}</div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:2 }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'0.92rem', fontWeight:700 }}>{char.name}</div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', fontStyle:'italic' }}>{char.title}</div>
            </div>
            <span style={{ fontSize:'0.55rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'#ffcc00',
              background:'rgba(0,0,0,0.5)', padding:'1px 5px', borderRadius:3 }}>SSR</span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:3 }}>
            <ElementBadge element={char.element} />
            <span style={{ fontSize:'0.62rem', color:TYPE_COLOR[char.type], fontFamily:'var(--font-mono)', fontWeight:700 }}>{char.type}</span>
          </div>
          <div style={{ display:'flex', gap:10, fontSize:'0.62rem', fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'#60cc60' }}>♦ {char.base_hp.toLocaleString()}</span>
            <span style={{ color:'#ff9020' }}>✦ {char.base_atk.toLocaleString()}</span>
            <span style={{ color:'var(--charge-blue)' }}>+{char.charge_gain_per_turn}/t</span>
          </div>
        </div>
      </div>

      {/* Skills — always expanded, no toggle */}
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-dim)' }}>
        <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.05em', marginBottom:7 }}>SKILLS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {char.abilities.map(a => (
            <div key={a.id}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', fontWeight:700, color:'var(--text-bright)' }}>{a.name}</span>
                <span style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>CD {a.cooldown_max}t</span>
              </div>
              <div style={{ fontSize:'0.67rem', color:'var(--text-dim)', lineHeight:1.45 }}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charge attack */}
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border-dim)', background:'rgba(240,192,96,0.04)' }}>
        <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:4, letterSpacing:'0.05em' }}>CHARGE ATTACK</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:700, color:'var(--text-gold)', marginBottom:2 }}>{char.charge_attack.name}</div>
        <div style={{ fontSize:'0.67rem', color:'var(--text-dim)', lineHeight:1.45 }}>{char.charge_attack.description}</div>
      </div>

      {/* Action button */}
      <div style={{ padding:'8px 10px' }}>
        {slot_pick_mode ? (
          <button
            className="btn btn-primary"
            style={{ width:'100%', fontSize:'0.72rem', padding:'7px',
              background: in_party ? 'linear-gradient(135deg,#3a1a00,#6a3200)' : undefined }}
            onClick={onToggle}
          >
            {in_party ? `Move to Slot ${selected_slot+1}` : `→ Place in Slot ${selected_slot+1}`}
          </button>
        ) : in_party ? (
          <button className="btn btn-danger" style={{ width:'100%', fontSize:'0.72rem', padding:'7px' }}
            onClick={onToggle}>Remove from Party</button>
        ) : (
          <button className="btn btn-primary" style={{ width:'100%', fontSize:'0.72rem', padding:'7px' }}
            disabled={disabled} onClick={onToggle}>Add to Party</button>
        )}
      </div>
    </div>
  );
}

// ── TAB B: WEAPON ─────────────────────────────────────────────────────────────
function WeaponTab({ grid_weapon_ids, getWeapon, catalog_weapons, weapon_slot, filter_elem,
                     grid_stats, auto_modal, onSlotTap, onAssignWeapon, onClearSlot,
                     onFilterElem, onOpenAutoModal, onCloseAutoModal, onAutoFill }) {
  const main_weapon = getWeapon(grid_weapon_ids[0]);
  const filtered    = catalog_weapons.filter(w => filter_elem === 'ALL' || w.element === filter_elem);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* Auto Select modal overlay */}
      {auto_modal && (
        <AutoSelectModal
          onConfirm={onAutoFill}
          onClose={onCloseAutoModal}
        />
      )}

      {/* Stats bar */}
      {grid_stats && (
        <div style={{ background:'var(--bg-deep)', borderBottom:'1px solid var(--border-dim)',
          padding:'7px 14px', display:'flex', gap:20, alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:'0.62rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦ Total HP</span>
            <span style={{ fontSize:'0.95rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700 }}>{grid_stats.grid_hp.toLocaleString()}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:'0.62rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦ Total ATK</span>
            <span style={{ fontSize:'0.95rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight:700 }}>{grid_stats.grid_atk.toLocaleString()}</span>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
            {[['N×',grid_stats.normal_mult.toFixed(2),'var(--text-bright)'],['Ω×',grid_stats.omega_mult.toFixed(2),'var(--charge-blue)'],['EX×',grid_stats.ex_mult.toFixed(2),'var(--text-gold)']].map(([l,v,c]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'0.52rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>{l}</div>
                <div style={{ fontSize:'0.78rem', color:c, fontFamily:'var(--font-mono)', fontWeight:700 }}>{v}</div>
              </div>
            ))}
            {/* Auto Select button */}
            <button className="btn btn-gold btn-sm"
              style={{ marginLeft:10, padding:'4px 12px', fontSize:'0.65rem' }}
              onClick={onOpenAutoModal}>
              ⚡ Auto Select
            </button>
          </div>
        </div>
      )}

      {/* Main area: weapon grid + always-visible inventory panel */}
      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

        {/* Left: weapon grid — scrollable */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>

          {/* Main weapon */}
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
              MAIN WEAPON · sets MC element &amp; charge attack
            </div>
            <MainWeaponSlot weapon={main_weapon} selected={weapon_slot===0}
              onTap={() => onSlotTap(0)} onClear={() => onClearSlot(0)} />
          </div>

          {/* 3×3 sub grid */}
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6 }}>
              SUB WEAPONS · all skills always active
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
              {[1,2,3,4,5,6,7,8,9].map(slot => (
                <SubWeaponSlot key={slot} slot={slot}
                  weapon={getWeapon(grid_weapon_ids[slot])}
                  selected={weapon_slot===slot}
                  onTap={() => onSlotTap(slot)}
                  onClear={() => onClearSlot(slot)} />
              ))}
            </div>
          </div>

          {/* Grid stats */}
          {/* {grid_stats && (
            <div className="panel" style={{ padding:12 }}>
              <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:8 }}>GRID STATS</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:7 }}>
                {[['Normal ×',grid_stats.normal_mult.toFixed(3),'var(--text-bright)'],['Omega ×',grid_stats.omega_mult.toFixed(3),'var(--charge-blue)'],['EX ×',grid_stats.ex_mult.toFixed(3),'var(--text-gold)']].map(([l,v,c]) => (
                  <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-mid)', borderRadius:7, padding:'7px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.55rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:8 }}>
                {[['ATK',grid_stats.grid_atk?.toLocaleString()],['HP',grid_stats.grid_hp?.toLocaleString()],['Crit',(grid_stats.crit_rate*100).toFixed(1)+'%'],['Spd',grid_stats.charge_speed_bonus?(grid_stats.charge_speed_bonus*100).toFixed(0)+'%':'0%']].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg-deep)', border:'1px solid var(--border-dim)', borderRadius:6, padding:'6px 7px' }}>
                    <div style={{ fontSize:'0.52rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{l}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text-bright)', fontWeight:700 }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:'0.57rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', lineHeight:1.5 }}>
                DMG = ATK × {grid_stats.normal_mult.toFixed(2)} × {grid_stats.omega_mult.toFixed(2)} × {grid_stats.ex_mult.toFixed(2)} × Elem × Crit − DEF
              </div>
            </div>
          )} */}
          {grid_stats && (
  <GridStatsPanel 
    grid_stats={grid_stats} 
    main_element={main_weapon?.element || 'None'} 
  />
)}
        </div>

        {/* Right: ALWAYS-VISIBLE inventory panel (pinned) */}
        <div style={{
          width:300, flexShrink:0,
          borderLeft:'1px solid var(--border-dim)',
          display:'flex', flexDirection:'column', overflow:'hidden',
          background:'var(--bg-panel)',
        }}>
          {/* Picker header */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border-dim)', flexShrink:0 }}>
            <div style={{ fontSize:'0.65rem', fontFamily:'var(--font-mono)', fontWeight:700, marginBottom:8,
              color: weapon_slot !== null ? 'var(--gold-bright)' : 'var(--text-dim)' }}>
              {weapon_slot !== null
                ? `▶ Slot ${weapon_slot}${weapon_slot===0?' (Main)':''} — tap weapon to assign`
                : 'WEAPON INVENTORY · select a slot first'
              }
            </div>
            {/* Element filters */}
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
          {/* Weapon list — always visible */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
            {filtered.map(w => {
              const in_grid   = grid_weapon_ids.includes(w.id);
              const clickable = weapon_slot !== null && !in_grid;
              return (
                <WeaponPickerCard key={w.id} weapon={w} in_grid={in_grid}
                  clickable={clickable}
                  onPick={() => clickable && onAssignWeapon(w.id)} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUTO SELECT MODAL ─────────────────────────────────────────────────────────
function AutoSelectModal({ onConfirm, onClose }) {
  const [stat, setStat]     = useState('ATK');
  const [element, setElem]  = useState('ALL');
  const ELEMENTS = ['ALL','FIRE','WATER','EARTH','WIND','LIGHT','DARK'];
  const ELEM_CLR = { FIRE:'var(--fire)', WATER:'var(--water)', EARTH:'var(--earth)',
    WIND:'var(--wind)', LIGHT:'var(--light)', DARK:'var(--dark)', ALL:'var(--text-mid)' };

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:50,
      background:'rgba(4,8,18,0.82)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }} onClick={onClose}>
      <div className="panel" style={{ width:320, padding:24 }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700,
          color:'var(--text-gold)', marginBottom:4 }}>⚡ Auto Select</div>
        <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', marginBottom:18, lineHeight:1.5 }}>
          Auto-fills all 10 weapon slots with the best matching weapons from your inventory.
          Slots with no matching weapons are left empty.
        </div>

        {/* Stat priority */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
            letterSpacing:'0.06em', marginBottom:8 }}>PRIORITISE STAT</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {['ATK','HP'].map(s => (
              <button key={s}
                className={stat===s ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ padding:'10px', fontSize:'0.8rem', fontWeight:700 }}
                onClick={() => setStat(s)}>
                {s==='ATK' ? '✦ Attack' : '♦ HP'}
              </button>
            ))}
          </div>
        </div>

        {/* Element */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:'0.62rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
            letterSpacing:'0.06em', marginBottom:8 }}>ELEMENT FILTER</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {ELEMENTS.map(e => (
              <button key={e}
                onClick={() => setElem(e)}
                style={{
                  padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer', fontSize:'0.65rem',
                  fontFamily:'var(--font-mono)', fontWeight:700, transition:'all 0.12s',
                  background: element===e ? 'rgba(32,96,200,0.25)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${element===e ? 'var(--border-bright)' : 'var(--border-dim)'}`,
                  color: element===e ? ELEM_CLR[e] : 'var(--text-dim)',
                }}>
                {e}
              </button>
            ))}
          </div>
          {element !== 'ALL' && (
            <div style={{ marginTop:8, fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)', lineHeight:1.4 }}>
              ℹ Slots with no {element} weapons will be left empty
            </div>
          )}
        </div>

        {/* Confirm */}
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" style={{ flex:2 }} onClick={() => onConfirm(stat, element)}>
            ⚡ Auto Fill Grid
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WEAPON SLOT COMPONENTS ────────────────────────────────────────────────────
function MainWeaponSlot({ weapon, selected, onTap, onClear }) {
  return (
    <div onClick={onTap} style={{
      border:`2px solid ${selected?'var(--border-bright)':weapon?'var(--gold-dim)':'var(--border-dim)'}`,
      borderRadius:12, cursor:'pointer', transition:'all 0.15s', position:'relative',
      background: selected?'rgba(32,96,200,0.12)':weapon?'linear-gradient(135deg,rgba(120,88,0,0.1),transparent)':'transparent',
      display:'flex', gap:12, padding:14, alignItems:'center',
      justifyContent: 'space-between' // Đẩy icon sang phải
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width:52, height:68, flexShrink:0, borderRadius:8,
          background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-dim)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', position:'relative',
        }}>
          {weapon ? '🗡' : <span style={{ opacity:0.2 }}>+</span>}
        </div>
        
        {weapon && (
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:700 }}>{weapon.name}</div>
            <div style={{ display:'flex', gap:8, margin:'4px 0' }}><ElementBadge element={weapon.element} /></div>
            <div style={{ display:'flex', gap:10 }}>
              <span style={{ fontSize:'0.65rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦ {weapon.base_hp}</span>
              <span style={{ fontSize:'0.65rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦ {weapon.base_atk}</span>
            </div>
          </div>
        )}
      </div>
        {weapon && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {weapon.skills.map((sk, i) => (
            <WeaponSkillRow key={i} weapon={weapon} skill={sk} />
          ))}
        </div>
      )}
      {/* HIỂN THỊ ICON KỸ NĂNG BÊN PHẢI */}
      {/* {weapon && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {weapon.skills.map((sk, i) => (
            <WeaponSkillIcon key={i} element={weapon.element} skillType={sk.skill_type} size={42} />
          ))}
        </div>
      )} */}

      {!weapon && (
        <div style={{ color:'var(--text-dim)', fontSize:'0.78rem' }}>
          {selected ? '← Pick from weapon list' : 'Tap to set Main Weapon'}
        </div>
      )}
      
      {weapon && (
        <button className="btn btn-danger" style={{ position:'absolute', top:6, right:6, padding:'2px 6px', fontSize:'0.58rem' }}
          onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
      )}
    </div>
  );
}

function SubWeaponSlot({ slot, weapon, selected, onTap, onClear }) {
  return (
    <div onClick={onTap} style={{
      border:`1px solid ${selected?'var(--border-bright)':weapon?'var(--border-mid)':'var(--border-dim)'}`,
      borderRadius:12, cursor:'pointer', transition:'all 0.12s', position:'relative',
      background:selected?'rgba(32,96,200,0.12)':weapon?'rgba(255,255,255,0.02)':'transparent',
      minHeight:110, padding:'12px', userSelect:'none',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      {weapon ? (
        <>
          {/* PHẦN TRÊN: Tên và Nguyên tố */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:700, color: 'var(--text-bright)' }}>
                {weapon.name}
              </div>
              <span className={`rarity-${weapon.rarity}`} style={{ fontSize:'0.6rem', fontFamily:'var(--font-mono)', opacity: 0.7 }}>
                {weapon.rarity}
              </span>
            </div>
            <ElementBadge element={weapon.element} />
          </div>

          {/* PHẦN GIỮA & DƯỚI: Chỉ số và Kỹ năng */}
          {/* Cấu trúc flex-grow giúp đẩy kỹ năng lên trên nếu chỉ có 1 skill */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', // Đổi từ flex-end sang flex-start để kỹ năng nằm trên
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            paddingTop: '10px',
            flex: 1 
          }}>
            {/* HP/ATK Stats: Nâng cao vị trí bằng padding-top */}
            <div style={{ display:'flex', flexDirection: 'column', gap: 6, paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize:'0.65rem', color:'#60cc60', fontFamily:'var(--font-mono)', width: 12 }}>♦</span>
                <span style={{ fontSize:'0.85rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight: 700 }}>
                  {weapon.base_hp.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize:'0.65rem', color:'#ff9020', fontFamily:'var(--font-mono)', width: 12 }}>✦</span>
                <span style={{ fontSize:'0.85rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight: 700 }}>
                  {weapon.base_atk.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Cụm Kỹ năng: Sẽ tự động căn lên trên nhờ alignItems: flex-start ở cha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {weapon.skills.map((sk, i) => (
                <WeaponSkillRow key={i} weapon={weapon} skill={sk} compact={true} />
              ))}
            </div>
          </div>

          <button className="btn btn-danger" style={{ position:'absolute', top:6, right:6, padding:'2px 6px', fontSize:'0.5rem', zIndex: 10 }}
            onClick={e => { e.stopPropagation(); onClear(); }}>✕</button>
        </>
      ) : (
        <div style={{ height:'100%', minHeight:80, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
          <span style={{ fontSize:'1.2rem', opacity:0.2 }}>+</span>
          <span style={{ fontSize:'0.6rem', color:selected?'var(--charge-blue)':'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
            {selected ? 'pick' : `Slot ${slot}`}
          </span>
        </div>
      )}
    </div>
  );
}

function WeaponPickerCard({ weapon, in_grid, clickable, onPick }) {
  return (
    <div style={{ 
      background:'var(--bg-card)', borderRadius:8, border:'1px solid var(--border-dim)',
      padding:'8px 10px', cursor: clickable ? 'pointer' : 'default',
      opacity: in_grid ? 0.38 : 1, transition:'all 0.12s',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center' // Flex ngang
    }} onClick={onPick}>
      
      <div style={{ flex: 1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'0.78rem', fontWeight:700 }}>{weapon.name}</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <ElementBadge element={weapon.element} />
          <span style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>✦{weapon.base_atk}</span>
        </div>
      </div>

      {/* ICON KỸ NĂNG BẢN NHỎ */}
      <div style={{ display: 'flex', gap: 4 }}>
        {weapon.skills.map((sk, i) => (
          <WeaponSkillIcon key={i} element={weapon.element} skillType={sk.skill_type} size={28} />
        ))}
      </div>
    </div>
  );
}

// ── TAB C: SUMMON ─────────────────────────────────────────────────────────────
function SummonTab() {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24 }}>
      <div style={{ fontSize:'3rem', opacity:0.3 }}>💎</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--text-dim)' }}>Summon Grid</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-dim)', fontStyle:'italic', textAlign:'center', maxWidth:300, lineHeight:1.6 }}>
        Summons provide passive aura bonuses to your party.<br/>Main summon can be called once per battle for a powerful active effect.
      </div>
      <div style={{ padding:'8px 20px', borderRadius:20, background:'rgba(100,100,100,0.1)',
        border:'1px solid var(--border-dim)', fontSize:'0.72rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
        Coming in v2.0
      </div>
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ ally_count, weapon_count, onBack, onConfirm }) {
  return (
    <div style={{ background:'var(--bg-panel)', borderTop:'1px solid var(--border-dim)',
      padding:'7px 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
      <div style={{ display:'flex', gap:5, marginLeft:6 }}>
        <div style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem', fontFamily:'var(--font-mono)',
          background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)', color:'var(--text-mid)' }}>
          👤 {ally_count}/3
        </div>
        <div style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.62rem', fontFamily:'var(--font-mono)',
          background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-dim)', color:'var(--text-mid)' }}>
          🗡 {weapon_count}/10
        </div>
      </div>
      <button className="btn btn-gold btn-sm" style={{ marginLeft:'auto', padding:'6px 18px' }} onClick={onConfirm}>
        ✓ Done
      </button>
    </div>
  );
}

// ── GRID STATS PANEL — Tự động hiển thị kỹ năng thực tế ──────────────────────
function GridStatsPanel({ grid_stats, main_element }) {
  if (!grid_stats) return null;

  // 1. Danh sách tất cả các chỉ số tiềm năng dựa trên constants.js
  const allPossibleBoosts = [
    { label: "Might",       val: (grid_stats.normal_mult - 1) * 100,        color: "var(--text-mid)"     },
    { label: "Ω Might",     val: (grid_stats.omega_mult  - 1) * 100,        color: "var(--charge-blue)"  },
    { label: "EX Might",    val: (grid_stats.ex_mult     - 1) * 100,        color: "var(--text-gold)"    },
    { label: "Stamina",     val: grid_stats.stamina_normal_pct || 0,         color: "var(--hp-green)"     },
    { label: "Ω Stamina",   val: grid_stats.stamina_omega_pct  || 0,         color: "#4fc3f7"             },
    { label: "EX Stamina",  val: grid_stats.stamina_ex_pct     || 0,         color: "#ffd54f"             },
    { label: "Enmity",      val: grid_stats.enmity_normal_pct  || 0,         color: "var(--hp-red)"       },
    { label: "Ω Enmity",    val: grid_stats.enmity_omega_pct   || 0,         color: "#ef9a9a"             },
    { label: "EX Enmity",   val: grid_stats.enmity_ex_pct      || 0,         color: "#ff8a65"             },
    { label: "HP Skill",    val: grid_stats.hp_skill_pct        || 0,         color: "#60cc60"             },
    { label: "Critical",    val: (grid_stats.crit_rate || 0) * 100,          color: "var(--crit-orange)"  },
    { label: "NA Cap",      val: grid_stats.dmg_cap_na          || 0,         color: "var(--text-gold)"    },
    { label: "CA Cap",      val: grid_stats.dmg_cap_ca          || 0,         color: "var(--text-gold)"    },
    { label: "DMG Supp.",   val: grid_stats.supplemental         || 0,         color: "var(--text-gold)", isFlat: true },
  ];

  // Filter: only show boosts with non-zero values
  const activeBoosts = allPossibleBoosts.filter(b => b.val > 0);

  return (
    <div className="panel" style={{ padding: '20px', background: 'var(--bg-deep)', border: '1px solid var(--border-dim)', borderRadius: '12px' }}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', color: 'var(--text-gold)', fontSize: '0.9rem', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Estimated Damage
      </div>

      {/* ZONE 1: Tóm tắt Sát thương & HP */}
      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Estimated DMG</span>
          <span style={{ color: '#ff9020', fontWeight: 700, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
            {Math.round(grid_stats.estimated_dmg || 0).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>vs Weak Element</span>
          <span style={{ color: '#ff6b35', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
            {Math.round((grid_stats.estimated_dmg || 0) * 1.5).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Max HP</span>
          <span style={{ color: '#60cc60', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
            {Math.round(grid_stats.mc_max_hp || grid_stats.grid_hp || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ZONE 2: Aura Boosts (Elemental Multipliers) */}
      <div style={{ display: 'flex', justifyContent: 'space-around', paddingBottom: '15px', borderBottom: '1px solid var(--border-dim)', marginBottom: '15px' }}>
  {['normal', 'omega', 'ex'].map(type => {
    // Lấy giá trị aura từ grid_stats, mặc định là 1.0 (100%)
    const auraVal = grid_stats[`${type}_aura`] || 1.0;
    
    // Tính toán % hiển thị: (Giá trị - 1.0) * 100
    // Ví dụ: 1.0 -> 0%, 2.4 -> 140%
    const displayAura = ((auraVal - 1.0) * 100).toFixed(0) + '%';

    return (
      <div key={type} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{type} Aura</div>
        <div style={{ 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          color: type === 'omega' ? 'var(--charge-blue)' : type === 'ex' ? 'var(--text-gold)' : 'var(--text-bright)' 
        }}>
          {displayAura}
        </div>
      </div>
    );
  })}
</div>

      {/* ZONE 3: Danh sách Kỹ năng dạng Pill (Không dùng icon) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {activeBoosts.map((b, i) => (
          <StatRowPill 
            key={i} 
            label={b.label} 
            val={b.isFlat ? `+${Math.round(b.val).toLocaleString()}` : `${b.val.toFixed(1)}%`} 
            color={b.color} 
          />
        ))}
      </div>
    </div>
  );
}

// ── COMPONENT CON: Nhãn kỹ năng có viền màu ──────────────────────────────────
function StatRowPill({ label, val, color }) {
  return (
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
      borderLeft: `3px solid ${color}` 
    }}>
      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--text-bright)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{val}</span>
    </div>
  );
}