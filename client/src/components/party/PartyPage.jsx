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
    catalog_characters, catalog_weapons, catalog_mc_classes, loadCatalog,
    party_character_ids, setPartyCharacters,
    grid_weapon_ids, setGridWeapon, clearGridSlot,
    grid_stats, calculateGridStats,
    mc_class_id, setMcClass,
    mc_selected_skills, setMcSelectedSkills,
    setScreen,
  } = useGameStore();

  const [active_tab,   setActiveTab]   = useState('character');
  const [weapon_slot,  setWeaponSlot]  = useState(null);
  const [filter_elem,  setFilterElem]  = useState('ALL');
  const [auto_modal,   setAutoModal]   = useState(false); // Auto Select modal open
  const [class_modal,  setClassModal]  = useState(false); // MC class picker modal

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
        mc_class={catalog_mc_classes.find(cl => cl.id === mc_class_id)}
        mc_selected_skills={mc_selected_skills}
        onSetSelectedSkills={setMcSelectedSkills}
        onHeaderSlotTap={onHeaderSlotTap}
        onOpenClassModal={() => setClassModal(true)}
        onRemoveSlot={i => {
          const n = [...Array(3)].map((_,j) => main_ids[j]||null);
          n[i] = null;
          setPartyCharacters(n.filter(Boolean));
          if (selected_slot === i) setSelectedSlot(null);
        }}
      />

      {/* MC Class Picker Modal */}
      {class_modal && (
        <MCClassModal
          classes={catalog_mc_classes}
          current_id={mc_class_id}
          grid_stats={grid_stats}
          onSelect={id => { setMcClass(id); setClassModal(false); }}
          onClose={() => setClassModal(false)}
        />
      )}

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

// ─────────────────────────────────────────────────────────────────────────────
// ROLE / EFFECT TYPE COLOURS
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CLR  = { ATTACK:'#ff5540', DEF:'#4499ff', HEAL:'#38e060', BALANCE:'#aa77ff', SPECIAL:'#ffaa20', ATK:'#ff5540' };
const ROLE_ICON = { ATTACK:'⚔', ATK:'⚔', DEF:'🛡', HEAL:'💚', BALANCE:'⚖', SPECIAL:'✨' };
const EFFECT_CLR= { DAMAGE:'#ff6040', BUFF:'#4090ff', HEAL:'#38e060', DEBUFF:'#c060ff' };
const EFFECT_ICON={ DAMAGE:'⚔', BUFF:'↑', HEAL:'♥', DEBUFF:'↓' };
const ROW_LABEL = { 1:'Row I', 2:'Row II', 3:'Row III', 4:'Row IV', 5:'Row V' };

// ── MC CLASS PICKER MODAL ─────────────────────────────────────────────────────
function MCClassModal({ classes, current_id, grid_stats, onSelect, onClose }) {
  const row5 = classes.filter(cl => cl.row === 5);
  const row1 = classes.filter(cl => cl.row <= 4);
  

  // Pre-compute grid multipliers — mirrors raidManager / GBF wiki:
  // Teammate cards show flat base stats: char.base + grid contribution (no skill multipliers)
  // Same principle as MC card — skill multipliers shown only in Estimated Damage / raid
  const grid_atk    = grid_stats?.grid_atk || 0;
  const grid_hp_val = grid_stats?.grid_hp  || 0;

  const boostedAtk = (base) => base + grid_atk;
  const boostedHp  = (base) => base + grid_hp_val;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:900, background:'rgba(4,8,18,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:620, maxHeight:'85dvh', background:'var(--bg-panel)',
        borderRadius:14, border:'1px solid var(--border-bright)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', color:'var(--text-gold)', fontSize:'1rem', fontWeight:700, marginBottom:3 }}>
            Select MC Class
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', lineHeight:1.5 }}>
            Row V classes unlock after reaching Master Level 30 on their prerequisite classes + 10,000 CP.
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Row V section */}
          <div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
              letterSpacing:'0.08em', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <span>ROW V — TIER 5</span>
              <div style={{ flex:1, height:1, background:'var(--border-dim)' }} />
              <span style={{ color:'var(--text-gold)' }}>★★★★★</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {row5.map(cl => (
                <ClassCard key={cl.id} cl={cl} active={cl.id===current_id} onSelect={onSelect} />
              ))}
            </div>
          </div>

          {/* Row I section */}
          {row1.length > 0 && (
            <div>
              <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)',
                letterSpacing:'0.08em', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                <span>STARTER CLASSES</span>
                <div style={{ flex:1, height:1, background:'var(--border-dim)' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {row1.map(cl => (
                  <ClassCard key={cl.id} cl={cl} active={cl.id===current_id} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border-dim)', flexShrink:0 }}>
          <button className="btn btn-ghost" style={{ width:'100%' }} onClick={onClose}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ClassCard({ cl, active, onSelect }) {
  const role_clr = ROLE_CLR[cl.role] || 'var(--text-dim)';
  const is_row5  = cl.row === 5;
  return (
    <div onClick={() => onSelect(cl.id)} style={{
      borderRadius:10, border:`1.5px solid ${active ? 'var(--charge-blue)' : is_row5 ? 'var(--border-mid)' : 'var(--border-dim)'}`,
      background: active
        ? 'rgba(32,96,200,0.22)'
        : is_row5
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)',
      padding:'10px 11px', cursor:'pointer', transition:'all 0.15s',
      boxShadow: active ? '0 0 14px rgba(32,96,200,0.35)' : 'none',
    }}>
      {/* Top row: class name + row badge */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'0.82rem', fontWeight:700, color: active ? 'var(--text-bright)' : 'var(--text-gold)' }}>
          {cl.name}
        </span>
        <span style={{ fontSize:'0.52rem', fontFamily:'var(--font-mono)', fontWeight:700,
          color: is_row5 ? 'var(--text-gold)' : 'var(--text-dim)',
          background:'rgba(0,0,0,0.5)', padding:'1px 5px', borderRadius:3 }}>
          {ROW_LABEL[cl.row] || 'Row'}
        </span>
      </div>

      {/* Role badge */}
      <div style={{ display:'flex', gap:4, alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:'0.62rem', fontFamily:'var(--font-mono)', fontWeight:700, color: role_clr }}>
          {ROLE_ICON[cl.role]} {cl.role}
        </span>
      </div>

      {/* Weapon proficiency */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
        {cl.weapon_prof.map(wp => (
          <span key={wp} style={{ fontSize:'0.52rem', fontFamily:'var(--font-mono)',
            color:'var(--text-dim)', background:'rgba(255,255,255,0.06)',
            border:'1px solid var(--border-dim)', padding:'1px 6px', borderRadius:10 }}>
            {wp}
          </span>
        ))}
      </div>

      {/* Preset skill name */}
      <div style={{ fontSize:'0.6rem', fontFamily:'var(--font-mono)', color:'var(--text-mid)',
        borderTop:'1px solid var(--border-dim)', paddingTop:5, marginTop:2 }}>
        <span style={{ color:'var(--text-dim)' }}>Preset: </span>
        <span style={{ color:'var(--text-bright)', fontWeight:600 }}>{cl.preset_skill?.name}</span>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:8, marginTop:5, fontSize:'0.56rem', fontFamily:'var(--font-mono)' }}>
        <span style={{ color:'#60cc60' }}>♦ {cl.base_hp.toLocaleString()}</span>
        <span style={{ color:'#ff9020' }}>✦ {cl.base_atk.toLocaleString()}</span>
      </div>

      {/* Active indicator */}
      {active && (
        <div style={{ marginTop:6, fontSize:'0.52rem', fontFamily:'var(--font-mono)', fontWeight:700,
          color:'var(--charge-blue)', textAlign:'center' }}>✓ EQUIPPED</div>
      )}
    </div>
  );
}

// ── HEADER BANNER ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// HEADER BANNER
// ─────────────────────────────────────────────────────────────────────────────
// Layout: [40% MC] [60% Main]
// MC side: portrait + stats + 4 inline skill slots + toggle arrow ▼
// Toggle opens a drawer BETWEEN header and character list that shows all class
// skills with full description. Click a skill → assign to currently selected slot.
// Click a sub-slot (1-3) → that slot highlights + all slots blink → drawer opens
// automatically so user can pick a replacement.
// ─────────────────────────────────────────────────────────────────────────────
function HeaderBanner({ main_ids, getChar, total_hp, total_atk, main_element,
                        party_complete, selected_slot, mc_class,
                        mc_selected_skills, onSetSelectedSkills,
                        onHeaderSlotTap, onRemoveSlot, onOpenClassModal }) {
  const is_swap_mode = selected_slot !== null;

  // Which subskill slot (0|1|2) is currently "active" for replacement
  const [active_skill_slot, setActiveSkillSlot] = useState(null);
  // Is the skill drawer open?
  const [drawer_open, setDrawerOpen] = useState(false);

  const role_clr = mc_class ? (ROLE_CLR[mc_class.role] || 'var(--gold-dim)') : 'var(--gold-dim)';

  const subskills = [0,1,2].map(i => (mc_selected_skills || [])[i] || null);
  const selected_names = subskills.filter(Boolean).map(s => s.name);

  const E_CLR  = { DAMAGE:'#ff6040', BUFF:'#4090ff', HEAL:'#38e060', DEBUFF:'#c060ff' };
  const E_ICON = { DAMAGE:'⚔', BUFF:'↑', HEAL:'♥', DEBUFF:'↓' };

  // Click a sub-slot header tile
  const onSubSlotClick = (idx) => {
    if (!mc_class) return;
    if (active_skill_slot === idx) {
      // Deselect
      setActiveSkillSlot(null);
    } else {
      setActiveSkillSlot(idx);
      setDrawerOpen(true); // auto-open drawer
    }
  };

  // Assign a skill from the drawer to the active slot
  const assignSkill = (sk) => {
    if (active_skill_slot === null) return;
    const arr = [0,1,2].map(i => (mc_selected_skills || [])[i] || null);
    arr[active_skill_slot] = sk;
    onSetSelectedSkills(arr);
    setActiveSkillSlot(null);
    // Keep drawer open so user can see the result
  };

  // Remove a skill from a slot
  const removeSkill = (idx, e) => {
    e?.stopPropagation();
    const arr = [0,1,2].map(i => (mc_selected_skills || [])[i] || null);
    arr[idx] = null;
    onSetSelectedSkills(arr);
    if (active_skill_slot === idx) setActiveSkillSlot(null);
  };

  const toggleDrawer = () => {
    setDrawerOpen(p => !p);
    if (drawer_open) setActiveSkillSlot(null); // clear selection on close
  };

  return (
    <div style={{
      flexShrink: 0,
      background: 'linear-gradient(135deg,#071220 0%,#0b1a2e 60%,#060e1c 100%)',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      {/* ── HEADER ROW: 40/60 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 3fr' }}>

        {/* ── LEFT 40%: MC ── */}
        <div style={{
          borderRight: '1px solid var(--border-dim)',
          background: 'linear-gradient(135deg,rgba(120,80,0,0.12) 0%,transparent 60%)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Portrait + stats */}
          <div style={{ padding:'10px 12px 8px', display:'flex', gap:10, alignItems:'center' }}>
            {/* Portrait — click → change class */}
            <div style={{
              width:52, height:56, flexShrink:0, borderRadius:9, position:'relative',
              background:'linear-gradient(160deg,rgba(120,80,0,0.45),rgba(40,20,0,0.7))',
              border:'1px solid var(--gold-dim)', overflow:'hidden', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
              padding:'0 3px 4px',
            }} onClick={onOpenClassModal}>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:'1.8rem', opacity:0.2 }}>
                {mc_class ? (ROLE_ICON[mc_class.role] || '⚔') : '⚔'}
              </div>
              {main_element && <div style={{ position:'absolute', top:3, right:3, fontSize:'0.7rem' }}>{ELEM_EMOJI[main_element]}</div>}
              <div style={{ position:'relative', zIndex:1, fontSize:'0.4rem', color:'var(--gold-bright)',
                fontFamily:'var(--font-mono)', background:'rgba(0,0,0,0.78)',
                borderRadius:3, padding:'1px 4px', textAlign:'center', whiteSpace:'nowrap' }}>
                {mc_class?.name || 'Fighter'}
              </div>
            </div>

            {/* Name + stats */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:1 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'0.76rem', fontWeight:700, color:'var(--text-gold)' }}>
                  Sky-Wanderer
                </span>
                {mc_class && (
                  <span style={{ fontSize:'0.46rem', color:role_clr, fontFamily:'var(--font-mono)',
                    fontWeight:700, background:'rgba(0,0,0,0.5)', padding:'0 4px', borderRadius:3 }}>
                    {mc_class.name}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:'0.52rem', color:'#60cc60', fontFamily:'var(--font-mono)' }}>♦ HP</span>
                  <span style={{ fontSize:'0.76rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700 }}>{total_hp.toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:'0.52rem', color:'#ff9020', fontFamily:'var(--font-mono)' }}>✦ ATK</span>
                  <span style={{ fontSize:'0.76rem', color:'#ff9020', fontFamily:'var(--font-mono)', fontWeight:700 }}>{total_atk.toLocaleString()}</span>
                </div>
              </div>
              {party_complete && (
                <div style={{ marginTop:3, fontSize:'0.46rem', color:'#60cc60', fontFamily:'var(--font-mono)', fontWeight:700,
                  background:'rgba(50,180,50,0.15)', border:'1px solid rgba(50,180,50,0.35)',
                  padding:'1px 6px', borderRadius:20, display:'inline-block' }}>✓ Complete</div>
              )}
            </div>
          </div>

          {/* ── 4 skill slot tiles + toggle arrow ── */}
          <div style={{ padding:'0 10px 0', display:'flex', gap:5, alignItems:'stretch' }}>
            {/* SLOT P: PRESET — always fixed, not clickable */}
            {(() => {
              const sk = mc_class?.preset_skill;
              return (
                <div style={{
                  flex:1, borderRadius:7, overflow:'hidden', flexShrink:0,
                  border:'1.5px solid rgba(240,192,48,0.45)',
                  background:'rgba(240,192,48,0.06)',
                }}>
                  <div style={{ height:36, display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(240,192,48,0.1)', position:'relative' }}>
                    {sk ? (
                      <div style={{
                        width:24, height:24, borderRadius:5,
                        background:'rgba(240,192,48,0.22)', border:'1.5px solid var(--text-gold)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'0.8rem', color:'var(--text-gold)',
                      }}>{E_ICON[sk.effect_type] || '◆'}</div>
                    ) : <span style={{ opacity:0.3, fontSize:'0.6rem' }}>?</span>}
                    <div style={{ position:'absolute', top:1, left:2, fontSize:'0.34rem',
                      fontFamily:'var(--font-mono)', color:'var(--text-gold)',
                      background:'rgba(0,0,0,0.75)', padding:'1px 3px', borderRadius:2 }}>P</div>
                    {sk?.cd === 0 && (
                      <div style={{ position:'absolute', top:1, right:2, fontSize:'0.32rem',
                        fontFamily:'var(--font-mono)', color:'#60cc60',
                        background:'rgba(0,0,0,0.75)', padding:'1px 3px', borderRadius:2 }}>FREE</div>
                    )}
                  </div>
                  <div style={{ padding:'2px 4px' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.48rem', fontWeight:700,
                      color:'var(--text-gold)', lineHeight:1.2,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {sk?.name || '—'}
                    </div>
                    <div style={{ fontSize:'0.4rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                      {sk ? (sk.cd === 0 ? 'FREE' : `CD ${sk.cd}t`) : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SLOTS 1-3: SUBSKILLS — selectable */}
            {[0,1,2].map(idx => {
              const sk    = subskills[idx];
              const clr   = sk ? (E_CLR[sk.effect_type] || '#888') : null;
              const icon  = sk ? (E_ICON[sk.effect_type] || '◆') : null;
              const rgb   = sk ? (sk.effect_type==='DAMAGE'?'255,80,32':sk.effect_type==='BUFF'?'64,144,255':sk.effect_type==='HEAL'?'56,224,96':'192,96,255') : null;
              const is_active = active_skill_slot === idx;
              const is_blinking = active_skill_slot !== null && active_skill_slot !== idx;

              return (
                <div key={idx}
                  onClick={() => onSubSlotClick(idx)}
                  style={{
                    flex:1, borderRadius:7, overflow:'hidden', cursor: mc_class ? 'pointer' : 'default',
                    border: `1.5px solid ${is_active
                      ? 'var(--charge-blue)'
                      : is_blinking
                        ? 'rgba(64,144,255,0.6)'
                        : sk ? (clr+'88') : 'var(--border-dim)'}`,
                    background: is_active
                      ? 'rgba(32,96,200,0.22)'
                      : sk ? `rgba(${rgb},0.06)` : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s',
                    boxShadow: is_active ? '0 0 10px rgba(64,144,255,0.5)' : is_blinking ? '0 0 6px rgba(64,144,255,0.3)' : 'none',
                    animation: is_blinking ? 'pulse-border 1s ease-in-out infinite' : 'none',
                    opacity: mc_class ? 1 : 0.4,
                  }}>
                  <div style={{ height:36, display:'flex', alignItems:'center', justifyContent:'center',
                    background: is_active ? 'rgba(32,96,200,0.2)' : sk ? `rgba(${rgb},0.1)` : 'rgba(255,255,255,0.02)',
                    position:'relative' }}>
                    {sk ? (
                      <>
                        <div style={{
                          width:24, height:24, borderRadius:5,
                          background:`rgba(${rgb},0.25)`, border:`1.5px solid ${is_active ? 'var(--charge-blue)' : clr}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'0.8rem', color: is_active ? 'var(--charge-blue)' : clr,
                        }}>{icon}</div>
                        {!is_active && (
                          <div style={{ position:'absolute', top:1, right:2, fontSize:'0.36rem',
                            color:'var(--hp-red)', background:'rgba(0,0,0,0.75)',
                            padding:'1px 3px', borderRadius:2, fontFamily:'var(--font-mono)' }}
                            onClick={e => removeSkill(idx, e)}>✕</div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize:'0.85rem', color: is_active ? 'var(--charge-blue)' : 'var(--text-dim)', opacity: is_active ? 1 : 0.2 }}>
                        {is_active ? '?' : '+'}
                      </span>
                    )}
                    {/* Slot number */}
                    <div style={{ position:'absolute', top:1, left:2, fontSize:'0.34rem',
                      fontFamily:'var(--font-mono)', color: is_active ? 'var(--charge-blue)' : 'var(--text-dim)',
                      background:'rgba(0,0,0,0.65)', padding:'1px 3px', borderRadius:2, fontWeight: is_active ? 700 : 400 }}>
                      {idx+1}
                    </div>
                    {/* "selected" label */}
                    {is_active && (
                      <div style={{ position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)',
                        fontSize:'0.3rem', color:'var(--charge-blue)', fontFamily:'var(--font-mono)',
                        background:'rgba(0,0,0,0.75)', padding:'0 3px', borderRadius:2, whiteSpace:'nowrap' }}>REPLACING</div>
                    )}
                  </div>
                  <div style={{ padding:'2px 4px' }}>
                    {sk ? (
                      <>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.48rem', fontWeight:700,
                          color: is_active ? 'var(--charge-blue)' : 'var(--text-bright)', lineHeight:1.2,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {sk.name}
                        </div>
                        <div style={{ fontSize:'0.4rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                          {sk.cd === 0 ? 'FREE' : `CD ${sk.cd}t`}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize:'0.44rem', color: is_active ? 'var(--charge-blue)' : 'var(--text-dim)',
                        fontFamily:'var(--font-mono)', textAlign:'center', padding:'2px 0',
                        fontWeight: is_active ? 700 : 400 }}>
                        {is_active ? '← pick below' : mc_class ? 'tap to add' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Toggle drawer button */}
            <button onClick={toggleDrawer} style={{
              width:28, flexShrink:0, border:'none', cursor:'pointer',
              background: drawer_open ? 'rgba(32,96,200,0.2)' : 'rgba(255,255,255,0.04)',
              color: drawer_open ? 'var(--charge-blue)' : 'var(--text-dim)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.7rem', transition:'all 0.15s',
              borderLeft: '1px solid var(--border-dim)',
              borderRadius: '0 7px 7px 0',
            }}>
              {drawer_open ? '▲' : '▼'}
            </button>
          </div>

          {/* Status bar below skill slots */}
          <div style={{ padding:'4px 12px 8px', fontSize:'0.46rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
            {active_skill_slot !== null
              ? <span style={{ color:'var(--charge-blue)', fontWeight:700 }}>
                  Slot {active_skill_slot+1} selected — pick a skill below · click slot again to cancel
                </span>
              : drawer_open
                ? <span>Skill list open — click a skill to equip · click slot 1-3 to target</span>
                : <span>Preset fixed · tap slot 1-3 to swap · ▼ to view all skills</span>
            }
          </div>
        </div>

        {/* ── RIGHT 60%: 3 main ally slots ── */}
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column' }}>
          <div style={{ fontSize:'0.55rem',
            color: is_swap_mode ? 'var(--charge-blue)' : 'var(--text-dim)',
            fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:6,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>
              {is_swap_mode
                ? `SLOT ${selected_slot+1} SELECTED — tap another slot to swap`
                : 'MAIN MEMBERS · tap to select & swap'}
            </span>
            {is_swap_mode && (
              <button onClick={() => onHeaderSlotTap(selected_slot)}
                style={{ fontSize:'0.55rem', color:'var(--text-dim)', background:'none',
                  border:'none', cursor:'pointer', padding:'0 4px' }}>✕ cancel</button>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, flex:1 }}>
            {[0,1,2].map(i => {
              const char = getChar(main_ids[i]);
              const is_selected    = selected_slot === i;
              const is_swap_target = is_swap_mode && selected_slot !== i;
              const elem_rgb = char ? ({
                FIRE:'255,80,32', WATER:'48,180,255', EARTH:'136,204,68',
                WIND:'160,255,176', LIGHT:'255,232,96', DARK:'192,96,255',
              }[char.element] || '200,200,200') : null;
              return (
                <div key={i} onClick={() => onHeaderSlotTap(i)} style={{
                  borderRadius:9, overflow:'hidden', position:'relative', cursor:'pointer',
                  border:`1px solid ${is_selected?'var(--charge-blue)':is_swap_target?'rgba(100,200,255,0.5)':char?'var(--border-mid)':'var(--border-dim)'}`,
                  background: is_selected ? 'rgba(32,96,200,0.25)' : is_swap_target ? 'rgba(32,96,200,0.12)'
                    : char ? `linear-gradient(160deg,rgba(${elem_rgb},0.18) 0%,transparent 80%)` : 'rgba(255,255,255,0.02)',
                  padding:'6px 8px', transition:'all 0.15s',
                  boxShadow: is_selected?'0 0 12px rgba(64,144,255,0.4)':is_swap_target?'0 0 8px rgba(64,144,255,0.2)':'none',
                  display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:80,
                }}>
                  {char ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <span style={{ fontSize:'0.48rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'#ffcc00',
                          background:'rgba(0,0,0,0.55)', padding:'1px 4px', borderRadius:3 }}>SSR</span>
                        {!is_swap_mode && (
                          <button style={{ fontSize:'0.48rem', color:'var(--hp-red)', background:'rgba(0,0,0,0.55)',
                            border:'none', borderRadius:3, cursor:'pointer', padding:'1px 4px', lineHeight:1 }}
                            onClick={e => { e.stopPropagation(); onRemoveSlot(i); }}>✕</button>
                        )}
                      </div>
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
                      {is_swap_target && (
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                          background:'rgba(32,96,200,0.22)', borderRadius:8, pointerEvents:'none' }}>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--charge-blue)', fontWeight:700 }}>⇄ swap</span>
                        </div>
                      )}
                      {is_selected && (
                        <div style={{ position:'absolute', bottom:4, right:5, fontSize:'0.5rem',
                          color:'var(--charge-blue)', fontFamily:'var(--font-mono)', fontWeight:700 }}>selected</div>
                      )}
                    </>
                  ) : (
                    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:3 }}>
                      {is_swap_target
                        ? <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--charge-blue)', fontWeight:700 }}>→ move here</span>
                        : <>
                            <span style={{ fontSize:'1rem', opacity:0.2 }}>+</span>
                            <span style={{ fontSize:'0.52rem', color: is_selected?'var(--charge-blue)':'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
                              {is_selected ? 'pick from roster' : 'Empty'}
                            </span>
                          </>
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SKILL DRAWER — pushes content below ── */}
      {drawer_open && mc_class && (
        <MCSkillDrawer
          mc_class={mc_class}
          subskills={subskills}
          active_slot={active_skill_slot}
          selected_names={selected_names}
          onAssign={assignSkill}
          onRemove={removeSkill}
          onSelectSlot={setActiveSkillSlot}
          E_CLR={E_CLR}
          E_ICON={E_ICON}
        />
      )}
    </div>
  );
}

// ── MC SKILL DRAWER ───────────────────────────────────────────────────────────
// Shows below the header. Lists all class skills (preset + subskills) with full
// descriptions. Clicking a skill assigns it to the active slot.
function MCSkillDrawer({ mc_class, subskills, active_slot, selected_names,
                         onAssign, onRemove, onSelectSlot, E_CLR, E_ICON }) {
  const all_skills = [
    mc_class.preset_skill ? { ...mc_class.preset_skill, _is_preset: true } : null,
    ...(mc_class.skills || []),
  ].filter(Boolean);

  return (
    <div style={{
      borderTop: '1px solid var(--border-dim)',
      background: 'rgba(6,10,22,0.97)',
      padding: '10px 14px',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'0.78rem', fontWeight:700, color:'var(--text-gold)' }}>
          {mc_class.name}
        </span>
        <span style={{ fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
          {mc_class.flavor}
        </span>
        {active_slot !== null ? (
          <span style={{ marginLeft:'auto', fontSize:'0.6rem', color:'var(--charge-blue)',
            fontFamily:'var(--font-mono)', fontWeight:700,
            background:'rgba(32,96,200,0.15)', border:'1px solid rgba(32,96,200,0.4)',
            padding:'2px 10px', borderRadius:20 }}>
            Slot {active_slot+1} selected — click a skill below to equip
          </span>
        ) : (
          <span style={{ marginLeft:'auto', fontSize:'0.58rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
            Click slot 1-3 above to select, then pick here
          </span>
        )}
      </div>

      {/* Skill cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {all_skills.map((sk, i) => {
          const is_preset   = sk._is_preset;
          const clr         = is_preset ? 'var(--text-gold)' : (E_CLR[sk.effect_type] || '#888');
          const icon        = is_preset ? '★' : (E_ICON[sk.effect_type] || '◆');
          const rgb         = sk.effect_type==='DAMAGE'?'255,80,32':sk.effect_type==='BUFF'?'64,144,255':sk.effect_type==='HEAL'?'56,224,96':'192,96,255';
          const is_equipped = selected_names.includes(sk.name) || is_preset;
          // Which subskill slot is this equipped in (if any)?
          const slot_idx    = is_preset ? null : subskills.findIndex(s => s?.name === sk.name);
          const can_assign  = !is_preset && active_slot !== null;
          const will_replace= can_assign && slot_idx === active_slot; // clicking replaces same slot

          return (
            <div key={i}
              onClick={() => can_assign ? onAssign(sk) : null}
              style={{
                borderRadius:10, overflow:'hidden', cursor: can_assign ? 'pointer' : 'default',
                border: `1.5px solid ${can_assign
                  ? 'var(--charge-blue)'
                  : is_preset ? 'rgba(240,192,48,0.45)' : is_equipped ? 'rgba(80,160,80,0.5)' : 'var(--border-dim)'}`,
                background: can_assign
                  ? 'rgba(32,96,200,0.1)'
                  : is_preset ? 'rgba(240,192,48,0.07)' : is_equipped ? 'rgba(30,70,30,0.4)' : 'rgba(255,255,255,0.02)',
                transition:'all 0.15s',
                boxShadow: can_assign ? '0 0 12px rgba(32,96,200,0.3)' : 'none',
              }}>
              {/* Icon area */}
              <div style={{ height:46, display:'flex', alignItems:'center', justifyContent:'center',
                background: is_preset ? 'rgba(240,192,48,0.12)' : `rgba(${rgb},0.12)`,
                borderBottom:`1px solid ${is_preset?'rgba(240,192,48,0.2)':'var(--border-dim)'}`,
                position:'relative' }}>
                <div style={{
                  width:30, height:30, borderRadius:7,
                  background:`rgba(${is_preset?'240,192,48':rgb},0.22)`,
                  border:`2px solid ${clr}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'1rem', color:clr,
                  boxShadow: can_assign ? `0 0 10px ${clr}55` : `0 0 6px ${clr}33`,
                }}>{icon}</div>
                {/* Badges */}
                {is_preset && (
                  <div style={{ position:'absolute', top:3, left:4, fontSize:'0.38rem',
                    color:'var(--text-gold)', background:'rgba(0,0,0,0.75)',
                    padding:'1px 4px', borderRadius:3, fontFamily:'var(--font-mono)' }}>PRESET</div>
                )}
                {!is_preset && is_equipped && slot_idx >= 0 && (
                  <div style={{ position:'absolute', top:3, left:4, fontSize:'0.38rem',
                    color:'#60cc60', background:'rgba(0,0,0,0.75)',
                    padding:'1px 4px', borderRadius:3, fontFamily:'var(--font-mono)' }}>
                    SLOT {slot_idx+1}
                  </div>
                )}
                {can_assign && (
                  <div style={{ position:'absolute', top:3, right:4, fontSize:'0.38rem',
                    color:'var(--charge-blue)', background:'rgba(0,0,0,0.8)',
                    padding:'1px 4px', borderRadius:3, fontFamily:'var(--font-mono)', fontWeight:700 }}>
                    → {active_slot+1}
                  </div>
                )}
                {sk.cd === 0 && (
                  <div style={{ position:'absolute', bottom:3, right:4, fontSize:'0.36rem',
                    color:'#60cc60', background:'rgba(0,0,0,0.75)',
                    padding:'1px 3px', borderRadius:3, fontFamily:'var(--font-mono)' }}>FREE</div>
                )}
              </div>

              {/* Text area */}
              <div style={{ padding:'7px 8px' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.66rem', fontWeight:700,
                  color: can_assign ? 'var(--charge-blue)' : is_preset ? 'var(--text-gold)' : 'var(--text-bright)',
                  marginBottom:2 }}>
                  {sk.name}
                </div>
                <div style={{ display:'flex', gap:6, fontSize:'0.52rem', fontFamily:'var(--font-mono)',
                  color:'var(--text-dim)', marginBottom:5 }}>
                  <span style={{ color:clr, fontWeight:700 }}>{sk.effect_type}</span>
                  <span>CD {sk.cd === 0 ? <span style={{color:'#60cc60'}}>FREE</span> : `${sk.cd}t`}</span>
                </div>
                {/* Full description always shown */}
                <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', lineHeight:1.45 }}>
                  {sk.description}
                </div>
                {/* Action hint */}
                {can_assign && (
                  <div style={{ marginTop:5, padding:'4px 0', textAlign:'center',
                    fontSize:'0.58rem', color:'var(--charge-blue)', fontFamily:'var(--font-mono)',
                    fontWeight:700, borderTop:'1px solid rgba(32,96,200,0.3)' }}>
                    ▶ Equip to Slot {active_slot+1}
                  </div>
                )}
                {!is_preset && is_equipped && !can_assign && (
                  <button style={{ marginTop:5, width:'100%', padding:'3px 0',
                    fontSize:'0.55rem', color:'var(--hp-red)', background:'rgba(200,30,30,0.1)',
                    border:'1px solid rgba(200,30,30,0.3)', borderRadius:5, cursor:'pointer',
                    fontFamily:'var(--font-mono)' }}
                    onClick={e => { e.stopPropagation(); onRemove(slot_idx, e); }}>
                    ✕ Remove from Slot {slot_idx+1}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* CA placeholder slot */}
        {mc_class.charge_attack && (
          <div style={{
            borderRadius:10, overflow:'hidden',
            border:'1.5px solid rgba(240,192,48,0.2)',
            background:'rgba(240,192,48,0.03)',
          }}>
            <div style={{ height:46, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(240,192,48,0.06)',
              borderBottom:'1px solid rgba(240,192,48,0.15)', position:'relative' }}>
              <div style={{
                width:30, height:30, borderRadius:7,
                background:'rgba(240,192,48,0.15)', border:'2px solid rgba(240,192,48,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1rem', color:'rgba(240,192,48,0.6)',
              }}>★</div>
              <div style={{ position:'absolute', top:3, left:4, fontSize:'0.38rem',
                color:'rgba(240,192,48,0.6)', background:'rgba(0,0,0,0.75)',
                padding:'1px 4px', borderRadius:3, fontFamily:'var(--font-mono)' }}>CA</div>
            </div>
            <div style={{ padding:'7px 8px' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.66rem', fontWeight:700,
                color:'rgba(240,192,48,0.6)', marginBottom:2 }}>
                {mc_class.charge_attack.name}
              </div>
              <div style={{ fontSize:'0.52rem', fontFamily:'var(--font-mono)',
                color:'rgba(240,192,48,0.4)', marginBottom:5 }}>
                Charge Attack · auto at 100%
              </div>
              <div style={{ fontSize:'0.6rem', color:'rgba(100,120,160,0.6)', lineHeight:1.45 }}>
                {mc_class.charge_attack.description}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── MC SKILL CARD ─────────────────────────────────────────────────────────────
// Always shows full description. For subskills: tap to equip/unequip.
function MCSkillCard({ skill, is_preset, is_ca, is_selected, is_disabled, onToggle }) {
  if (!skill) return null;

  const effect_clr  = is_ca ? 'var(--text-gold)'
                    : is_selected ? '#60cc60'
                    : (EFFECT_CLR[skill.effect_type] || 'var(--text-dim)');
  const effect_icon = is_ca ? '★' : (EFFECT_ICON[skill.effect_type] || '◆');
  const is_free     = skill.cd === 0;
  const is_sub      = !is_preset && !is_ca;

  return (
    <div
      onClick={onToggle}
      style={{
        borderRadius:9, overflow:'hidden', transition:'all 0.15s',
        cursor: is_sub ? (is_disabled ? 'not-allowed' : 'pointer') : 'default',
        opacity: is_disabled ? 0.4 : 1,
        border: is_selected
          ? '1.5px solid #60cc60'
          : is_preset
            ? '1px solid rgba(240,192,48,0.35)'
            : is_ca
              ? '1px solid rgba(240,192,48,0.2)'
              : 'var(--border-dim)',
        background: is_selected
          ? 'rgba(40,100,40,0.25)'
          : is_preset
            ? 'rgba(240,192,48,0.08)'
            : is_ca
              ? 'rgba(240,192,48,0.04)'
              : 'rgba(255,255,255,0.02)',
        boxShadow: is_selected ? '0 0 10px rgba(80,200,80,0.2)' : 'none',
      }}>

      {/* Icon strip */}
      <div style={{
        height:40, display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        background: is_selected
          ? 'rgba(40,120,40,0.3)'
          : is_preset
            ? 'rgba(240,192,48,0.12)'
            : is_ca
              ? 'rgba(240,192,48,0.06)'
              : `rgba(${skill.effect_type==='DAMAGE'?'255,80,32':skill.effect_type==='BUFF'?'64,144,255':skill.effect_type==='HEAL'?'56,224,96':'192,96,255'},0.10)`,
        borderBottom:`1px solid ${is_selected?'rgba(80,180,80,0.3)':is_preset?'rgba(240,192,48,0.2)':'var(--border-dim)'}`,
      }}>
        <div style={{
          width:26, height:26, borderRadius:6, flexShrink:0,
          background:`rgba(${skill.effect_type==='DAMAGE'?'255,80,32':skill.effect_type==='BUFF'?'64,144,255':skill.effect_type==='HEAL'?'56,224,96':'192,96,255'},0.18)`,
          border:`1.5px solid ${effect_clr}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.85rem', color: effect_clr,
        }}>{effect_icon}</div>

        {is_preset && <div style={{ position:'absolute', top:2, left:4, fontSize:'0.4rem', fontFamily:'var(--font-mono)',
          color:'var(--text-gold)', background:'rgba(0,0,0,0.75)', padding:'1px 4px', borderRadius:2 }}>PRESET</div>}
        {is_ca && <div style={{ position:'absolute', top:2, left:4, fontSize:'0.4rem', fontFamily:'var(--font-mono)',
          color:'var(--text-gold)', background:'rgba(0,0,0,0.75)', padding:'1px 4px', borderRadius:2 }}>CA</div>}
        {is_free && !is_ca && <div style={{ position:'absolute', top:2, right:4, fontSize:'0.4rem', fontFamily:'var(--font-mono)',
          color:'#60cc60', background:'rgba(0,0,0,0.75)', padding:'1px 4px', borderRadius:2 }}>FREE</div>}
        {is_selected && <div style={{ position:'absolute', bottom:2, right:4, fontSize:'0.4rem', fontFamily:'var(--font-mono)',
          color:'#60cc60', background:'rgba(0,0,0,0.75)', padding:'1px 4px', borderRadius:2 }}>✓ ON</div>}
      </div>

      {/* Content — always fully visible */}
      <div style={{ padding:'7px 8px', display:'flex', flexDirection:'column', gap:3 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', fontWeight:700,
          color: is_selected ? '#80ff98' : is_ca ? 'var(--text-gold)' : 'var(--text-bright)',
          lineHeight:1.3 }}>
          {skill.name}
        </div>

        {/* CD + type row */}
        {!is_ca ? (
          <div style={{ display:'flex', gap:6, fontSize:'0.52rem', fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--text-dim)' }}>
              CD {is_free
                ? <span style={{ color:'#60cc60' }}>FREE</span>
                : <span style={{ color:'var(--charge-blue)' }}>{skill.cd}t</span>}
            </span>
            <span style={{ color: effect_clr, fontWeight:700 }}>{skill.effect_type}</span>
          </div>
        ) : (
          <div style={{ fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'rgba(240,192,48,0.55)' }}>
            v2.0 — grid CA system
          </div>
        )}

        {/* Description — always shown */}
        <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', lineHeight:1.5,
          borderTop:'1px solid var(--border-dim)', paddingTop:4, marginTop:2 }}>
          {skill.description}
        </div>

        {/* Equip hint for subskills */}
        {is_sub && !is_selected && !is_disabled && (
          <div style={{ fontSize:'0.5rem', color:'rgba(80,160,80,0.6)', fontFamily:'var(--font-mono)', marginTop:2 }}>
            + tap to equip
          </div>
        )}
        {is_sub && is_selected && (
          <div style={{ fontSize:'0.5rem', color:'rgba(200,80,80,0.7)', fontFamily:'var(--font-mono)', marginTop:2 }}>
            − tap to remove
          </div>
        )}
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
                  padding:'7px 4px', borderRadius:8, cursor:'pointer', fontSize:'0.65rem',
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
