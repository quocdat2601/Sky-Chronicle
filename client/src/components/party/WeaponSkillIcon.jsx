// ============================================================
// client/src/components/party/WeaponSkillIcon.jsx
//
// Renders a GBF-style weapon skill icon using the same
// 3-layer composite system as gbf_weapon_skill_icons.html:
//   Layer 1 (top-left):  multiplier type badge  (Ω / EX / none)
//   Layer 2 (center):    element art SVG orb
//   Layer 3 (bottom-right): effect badge SVG(s)
//
// Props:
//   element  — 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'LIGHT' | 'DARK'
//   skillType — key from SKILL_TYPES  e.g. 'ATK_OMEGA', 'RESTRAINT_EX'
//   size      — px (default 48)
//   tier      — 'small'|'medium'|'big'|'massive' (default 'big')
// ============================================================

import { SKILL_TYPES, ELEMENT_PREFIXES, getSkillName } from '@server-data/catalog.js';

// ── Element orb art (inline SVG, no external dep) ──────────
const EL_ART = {
  FIRE: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 36 C11 29 8 22 10 14 C12 8 16 6 16 6 C14 13 18 15 20 12 C22 9 21 5 21 5 C27 10 30 18 28 25 C27 29 24 32 20 36Z" fill="#FF6D00"/>
      <path d="M20 33 C14 27 12 21 14 15 C15 12 17 11 17 11 C16 15 18 17 20 15 C22 13 21 9 21 9 C25 13 27 19 25 25 C24 28 22 30 20 33Z" fill="#FFAB00"/>
      <path d="M20 30 C16 25 16 20 18 17 C18 21 20 22 21 19 C23 22 22 27 20 30Z" fill="#FFD740"/>
      <ellipse cx="14" cy="13" rx="3" ry="4" fill="rgba(255,255,255,0.18)" transform="rotate(-20,14,13)"/>
    </svg>
  ),
  WATER: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 7 C20 7 11 18 11 24 A9 9 0 0 0 29 24 C29 18 20 7 20 7Z" fill="#5BC8F5"/>
      <path d="M20 10 C20 10 13 20 13 24 A7 7 0 0 0 27 24 C27 20 20 10 20 10Z" fill="#A8E6FF"/>
      <path d="M20 13 C20 13 15 21 15 24 A5 5 0 0 0 25 24 C25 21 20 13 20 13Z" fill="rgba(255,255,255,0.35)"/>
      <ellipse cx="16" cy="20" rx="2" ry="3.5" fill="rgba(255,255,255,0.5)" transform="rotate(-15,16,20)"/>
    </svg>
  ),
  EARTH: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <polygon points="20,7 32,30 8,30" fill="#D4891A" stroke="#8B5500" strokeWidth="1.2"/>
      <polygon points="20,10 29,28 11,28" fill="#F0B040"/>
      <polygon points="20,14 26,26 14,26" fill="#FFD54F"/>
      <polygon points="20,18 24,25 16,25" fill="#FFF8DC" opacity="0.7"/>
      <ellipse cx="14" cy="14" rx="3" ry="4" fill="rgba(255,255,255,0.22)" transform="rotate(-20,14,14)"/>
    </svg>
  ),
  WIND: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <path d="M7 17 Q13 10 20 17 Q27 24 33 17" stroke="#B2FF80" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      <path d="M7 22 Q13 15 20 22 Q27 29 33 22" stroke="#80E880" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85"/>
      <path d="M9 27 Q15 20 22 27 Q29 34 35 27" stroke="#50CC50" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65"/>
      <ellipse cx="13" cy="14" rx="3" ry="4" fill="rgba(255,255,255,0.20)" transform="rotate(-20,13,14)"/>
    </svg>
  ),
  LIGHT: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 5 L21.8 16.5 L33 11 L24 20 L33 29 L21.8 23.5 L20 35 L18.2 23.5 L7 29 L16 20 L7 11 L18.2 16.5 Z" fill="#FFE840" stroke="#A07800" strokeWidth="0.6"/>
      <path d="M20 10 L21 17 L27 14 L22.5 20 L27 26 L21 23 L20 30 L19 23 L13 26 L17.5 20 L13 14 L19 17 Z" fill="#FFFAC0" opacity="0.7"/>
      <circle cx="20" cy="20" r="4.5" fill="white" opacity="0.85"/>
    </svg>
  ),
  DARK: (s) => (
    <svg viewBox="0 0 40 40" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 8 A12 12 0 0 0 22 32 A14 14 0 0 1 22 8Z" fill="#CE93D8" opacity="0.9"/>
      <circle cx="26" cy="13" r="3"   fill="#F3E5F5" opacity="0.75"/>
      <circle cx="14" cy="26" r="2"   fill="#E1BEE7" opacity="0.65"/>
      <circle cx="28" cy="25" r="1.5" fill="#F8BBD0" opacity="0.7"/>
      <circle cx="13" cy="15" r="1.5" fill="#E1BEE7" opacity="0.55"/>
    </svg>
  ),
};

// ── Element orb CSS gradient (matches the HTML file) ───────
const EL_BG = {
  FIRE:  'radial-gradient(circle at 40% 38%, #E85030 0%, #8B1A00 60%, #3A0800 100%)',
  WATER: 'radial-gradient(circle at 40% 38%, #2980B9 0%, #0D4A80 60%, #041530 100%)',
  EARTH: 'radial-gradient(circle at 40% 38%, #B8822A 0%, #6B4010 60%, #2A1800 100%)',
  WIND:  'radial-gradient(circle at 40% 38%, #27AE60 0%, #145E30 60%, #052010 100%)',
  LIGHT: 'radial-gradient(circle at 40% 38%, #C8A800 0%, #7A6000 60%, #2A2000 100%)',
  DARK:  'radial-gradient(circle at 40% 38%, #7B1FA2 0%, #3A0860 60%, #100020 100%)',
};

// ── Effect SVG components ───────────────────────────────────
const EffectSVG = {
  might: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="17" x2="14" y2="4" stroke="#E8D090" strokeWidth="2.2" strokeLinecap="round"/>
      <polygon points="13,2 16,3.5 15,5.5 12,4" fill="#E8D090"/>
      <line x1="4" y1="11" x2="7" y2="14" stroke="#E8D090" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="17" y1="17" x2="6" y2="4" stroke="#E8D090" strokeWidth="2.2" strokeLinecap="round"/>
      <polygon points="7,2 4,3.5 5,5.5 8,4" fill="#E8D090"/>
      <line x1="16" y1="11" x2="13" y2="14" stroke="#E8D090" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  enmity: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="9" rx="6" ry="6" fill="#D0D0D0" stroke="#888" strokeWidth="0.8"/>
      <rect x="6.5" y="13.5" width="7" height="4" rx="0.8" fill="#D0D0D0" stroke="#888" strokeWidth="0.7"/>
      <line x1="8.5" y1="14.2" x2="8.5" y2="17" stroke="#888" strokeWidth="0.9"/>
      <line x1="11.5" y1="14.2" x2="11.5" y2="17" stroke="#888" strokeWidth="0.9"/>
      <circle cx="7.5" cy="8.5" r="1.6" fill="#333"/>
      <circle cx="12.5" cy="8.5" r="1.6" fill="#333"/>
    </svg>
  ),
  stamina: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 15 C4 15 5 17 8 17 C9.5 17 10 15.5 11 14 L13 10 C14 8.5 16 8 17 9 L18 10 C18.5 10.5 18 11.5 17 12" stroke="#F48FB1" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M8 17 C7 15 7 13 8 11 C9 9.5 10.5 9 12 9 C14 9 14.5 7.5 14 5.5 C13.5 4 12 3.5 10.5 4 C9 4.5 8 6 8.5 8" stroke="#F48FB1" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  hp: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 17 C10 17 3 12 3 7 A4.5 4.5 0 0 1 10 5.5 A4.5 4.5 0 0 1 17 7 C17 12 10 17 10 17Z" fill="#4CAF50" stroke="#2E7D32" strokeWidth="0.7"/>
      <path d="M10 15 C10 15 5 11 5 7.5 A3 3 0 0 1 10 7 A3 3 0 0 1 15 7.5 C15 11 10 15 10 15Z" fill="#66BB6A" opacity="0.5"/>
    </svg>
  ),
  critical: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2 L11.5 8.5 L18 10 L11.5 11.5 L10 18 L8.5 11.5 L2 10 L8.5 8.5 Z" fill="#FFD740" stroke="#B8860B" strokeWidth="0.6"/>
      <path d="M10 5 L11 9 L15 10 L11 11 L10 15 L9 11 L5 10 L9 9 Z" fill="#FFF9C4" opacity="0.6"/>
    </svg>
  ),
  // 2-bolt: DA Rate only
  da: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,2 2.5,8.5 5,8.5 3.5,17 8.5,7.5 6,7.5 7.5,2" fill="#FFD740" stroke="#B8860B" strokeWidth="0.4"/>
      <polygon points="9.5,2 8,8.5 10.5,8.5 9,17 14,7.5 11.5,7.5 13,2" fill="#FFD740" stroke="#B8860B" strokeWidth="0.4" opacity="0.72"/>
    </svg>
  ),
  // 3-bolt: Trium (DA+TA multiattack rate)
  trium: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="2,2 0.8,7.5 3,7.5 1.8,15.5 6,7 3.8,7 5,2" fill="#FFD740" stroke="#B8860B" strokeWidth="0.35"/>
      <polygon points="6.8,2 5.6,7.5 7.8,7.5 6.6,15.5 10.8,7 8.6,7 9.8,2" fill="#FFD740" stroke="#B8860B" strokeWidth="0.35" opacity="0.82"/>
      <polygon points="11.6,2 10.4,7.5 12.6,7.5 11.4,15.5 15.6,7 13.4,7 14.6,2" fill="#FFD740" stroke="#B8860B" strokeWidth="0.35" opacity="0.62"/>
    </svg>
  ),
  def: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2 L17 5 L17 11 C17 15 10 18.5 10 18.5 C10 18.5 3 15 3 11 L3 5 Z" fill="#90CAF9" stroke="#1565C0" strokeWidth="0.9"/>
      <path d="M10 4.5 L14 7 L14 11 C14 13.5 10 15.5 10 15.5 C10 15.5 6 13.5 6 11 L6 7 Z" fill="#1565C0" opacity="0.45"/>
    </svg>
  ),
  cap: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,2 18,16 2,16" fill="#FF9800" stroke="#E65100" strokeWidth="0.9"/>
      <polygon points="10,5.5 15,14 5,14" fill="#E65100" opacity="0.55"/>
    </svg>
  ),
  supp: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="2.5" fill="#CE93D8"/>
      <circle cx="10" cy="4"  r="1.5" fill="#CE93D8" opacity="0.9"/>
      <circle cx="10" cy="16" r="1.5" fill="#CE93D8" opacity="0.9"/>
      <circle cx="4"  cy="10" r="1.5" fill="#CE93D8" opacity="0.9"/>
      <circle cx="16" cy="10" r="1.5" fill="#CE93D8" opacity="0.9"/>
    </svg>
  ),
  prog: (w, h) => (
    <svg viewBox="0 0 20 20" width={w} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10 A6 6 0 1 1 13 4.5" stroke="#66BB6A" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <polygon points="12,2 16,4.5 14,7" fill="#66BB6A"/>
    </svg>
  ),
};

// ── Tier stacked arrows ─────────────────────────────────────
const TIER_ARROWS = { small:1, medium:2, big:3, massive:4 };
const ARROW_COLORS = ['#FFD740','#FFB300','#FF6D00','#DD2C00'];

function TierArrows({ n, w, h }) {
  if (!n) return null;
  const padding = h * 0.06;
  const usableH = h - padding * 2;
  const step = usableH / n;
  const ah = step * 0.72;
  const aw = w * 0.82;
  const cx = w / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: n }, (_, i) => {
        const centerY = h - padding - (i + 0.5) * step;
        return (
          <polygon
            key={i}
            points={`${cx},${centerY - ah * 0.5} ${cx + aw / 2},${centerY + ah * 0.5} ${cx - aw / 2},${centerY + ah * 0.5}`}
            fill={ARROW_COLORS[Math.min(i, ARROW_COLORS.length - 1)]}
            opacity={Math.min(0.75 + i * 0.08, 1)}
            stroke="rgba(0,0,0,0.5)" strokeWidth="0.4"
          />
        );
      })}
    </svg>
  );
}

// ── Multiplier badge (top-left) ─────────────────────────────
const MULT_BADGE = {
  omega:  { label:'Ω',  color:'#FFE082', fontSize:13 },
  ex:     { label:'EX', color:'#FF6B6B', fontSize:10 },
  normal: null,
};

// ── Single effect badge (bottom-right) ─────────────────────
function SingleEffectBadge({ svgKey, tier, size }) {
  const n = TIER_ARROWS[tier] ?? 3;
  const aw = Math.round(size * 0.36);
  return (
    <div style={{ position:'relative', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {EffectSVG[svgKey]?.(size, size)}
      <div style={{ position:'absolute', top:0, right:0, lineHeight:0, pointerEvents:'none', filter:'drop-shadow(0 0 2px rgba(0,0,0,0.9))' }}>
        <TierArrows n={n} w={aw} h={size} />
      </div>
    </div>
  );
}

// ── Restraint composite badge (DA 2-bolt left + star right) ─
function RestraintBadge({ size }) {
  const half = Math.round(size * 0.52);
  return (
    <div style={{ display:'flex', alignItems:'center', width:size, height:size }}>
      {EffectSVG.da(half, size)}
      {EffectSVG.critical(half, size)}
    </div>
  );
}

// ── Dual badge (two separate effects side by side) ──────────
// Matches reference HTML: both badges full eSize, flex-row, e2 left / e1 right,
// the PARENT layer positions this absolute bottom-right — no extra wrapper here.
function DualEffectBadge({ svg1, svg2, tier1, tier2, size, scale }) {
  const gap = Math.round(1 * (scale ?? 1));
  return (
    <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-end', gap }}>
      <SingleEffectBadge svgKey={svg2} tier={tier2 ?? 'big'} size={size} />
      <SingleEffectBadge svgKey={svg1} tier={tier1 ?? 'big'} size={size} />
    </div>
  );
}

// ── Map icon descriptor to badge component ──────────────────
function EffectBadge({ iconDef, tier, size, scale }) {
  if (!iconDef) return null;
  if (iconDef.type === 'restraint') return <RestraintBadge size={size} />;
  if (iconDef.type === 'dual')      return <DualEffectBadge svg1={iconDef.svg} svg2={iconDef.svg2} tier1={tier} tier2={tier} size={size} scale={scale} />;
  return <SingleEffectBadge svgKey={iconDef.svg} tier={tier} size={size} />;
}

// ── MAIN EXPORT ─────────────────────────────────────────────
export default function WeaponSkillIcon({ element, skillType, size = 48, tier = 'big' }) {
  const def = SKILL_TYPES[skillType];
  if (!def) return null;

  const mult = MULT_BADGE[def.multiplierType];
  const scale = size / 64;
  const bSize = Math.round(22 * scale);
  const eSize = Math.round(size * 0.46);
  const badgeFontSize = mult?.fontSize ? Math.max(8, Math.round(mult.fontSize * scale)) : 10;

  return (
    <div style={{
      width: size, height: size, borderRadius: 6, position: 'relative', overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 0 0 2px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6)',
    }}>
      {/* Layer 1 — element orb background */}
      <div style={{
        position:'absolute', inset:0, background: EL_BG[element],
        border:'2px solid rgba(0,0,0,0.7)', borderRadius:6,
        display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden',
      }}>
        {/* specular highlight */}
        <div style={{
          position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
          background:'radial-gradient(ellipse 55% 45% at 28% 28%, rgba(255,255,255,0.32), transparent 55%)',
        }}/>
        {EL_ART[element]?.(size)}
      </div>

      {/* Layer 2 — multiplier type badge top-left */}
      {mult && (
        <div style={{
          position:'absolute', top: Math.round(2*scale), left: Math.round(2*scale),
          width: bSize, height: bSize, zIndex:3,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: mult.color, fontSize: badgeFontSize, fontWeight:900, lineHeight:1,
          fontFamily:'serif',
          textShadow:'0 0 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,1)',
        }}>
          {mult.label}
        </div>
      )}

      {/* Layer 3 — effect badge bottom-right */}
      <div style={{
        position:'absolute', bottom: Math.round(1*scale), right: Math.round(1*scale), zIndex:3,
        filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.95))',
      }}>
        <EffectBadge iconDef={def.icon} tier={tier} size={eSize} scale={scale} />
      </div>
    </div>
  );
}

// ── WeaponSkillRow — full row: icon + name + label ──────────
// Drop this into PartyPage's weapon card rendering
export function WeaponSkillRow({ weapon, skill }) {
  const skillName = getSkillName(weapon.element, skill.skill_type); // Từ constants.js
  const description = getFullSkillDescription(skill, weapon.element);

  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      padding: '8px', 
      background: 'rgba(0,0,0,0.3)', 
      borderRadius: '4px',
      marginBottom: '6px',
      alignItems: 'center'
    }}>
      {/* Cột 1: Icon 3 lớp */}
      <WeaponSkillIcon 
        element={weapon.element} 
        skillType={skill.skill_type} 
        size={42} 
        tier={skill.tier} 
      />

      {/* Cột 2: Nội dung văn bản (Bố cục dọc) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px' }}>
          <span style={{ color: 'var(--text-gold)', fontWeight: 700, fontSize: '0.85rem' }}>
            {skillName}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
            Lvl {skill.skill_level}
          </span>
        </div>
        <div style={{ color: 'var(--text-bright)', fontSize: '0.75rem', lineHeight: '1.2' }}>
          {description}
        </div>
      </div>
    </div>
  );
}
export function getFullSkillDescription(skill, element) {
  const typeDef = SKILL_TYPES[skill.skill_type];
  if (!typeDef) return "";
  
  const elemLabel = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
  const tierLabel = skill.tier ? (skill.tier.charAt(0).toUpperCase() + skill.tier.slice(1)) : "Big";
  
  // Maps skill suffix → readable stat description used in the description line
  const statMap = {
    'Might':     'ATK',
    'Stamina':   'ATK',
    'Enmity':    'ATK',
    'Aegis':     'max HP',
    'Verity':    'critical hit rate',
    'Courage':   'DA Rate',
    'Trium':     'DA Rate and TA Rate',
    'Majesty':   'ATK and max HP',
    'Restraint': 'DA Rate and critical hit rate',
    'Tyranny':   'ATK (reduces max HP)',
    'Celere':    'ATK and critical hit rate',
    'Alacrity':  'charge bar speed',
    'Exceed':    'damage cap',
    'Supplement':'elemental damage',
  };

  const statDisplay = statMap[typeDef.suffix] || typeDef.label;

  const hpClause =
    typeDef.suffix === 'Stamina' ? ' based on how high HP is' :
    typeDef.suffix === 'Enmity'  ? ' based on how low HP is'  : '';

  return `${tierLabel} boost to ${elemLabel} allies' ${statDisplay}${hpClause}`;
}