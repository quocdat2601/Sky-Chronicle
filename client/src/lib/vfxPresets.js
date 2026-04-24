// ─────────────────────────────────────────────────────────────────────────────
// VFX PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const ELEM_VFX = {
  FIRE:  { primary:'#ff4400', secondary:'#ff8800', glow:'rgba(255,80,0,0.6)'   },
  WATER: { primary:'#30b4ff', secondary:'#80d8ff', glow:'rgba(48,180,255,0.5)' },
  EARTH: { primary:'#88cc44', secondary:'#ccee88', glow:'rgba(136,204,68,0.5)' },
  WIND:  { primary:'#44ffaa', secondary:'#aaffdd', glow:'rgba(64,255,160,0.5)' },
  LIGHT: { primary:'#ffe860', secondary:'#fffacc', glow:'rgba(255,232,96,0.6)' },
  DARK:  { primary:'#c060ff', secondary:'#e0a0ff', glow:'rgba(192,96,255,0.5)' },
};

export const FLASH = {
  attack:       { color:'rgba(255,255,255,0.22)', duration:55  },
  skill_damage: { color:'rgba(255,120,0,0.18)',   duration:90  },
  skill_buff:   { color:'rgba(64,144,255,0.15)',  duration:80  },
  skill_debuff: { color:'rgba(160,32,200,0.16)',  duration:80  },
  skill_heal:   { color:'rgba(50,200,80,0.14)',   duration:75  },
  charge_attack:{ color:'rgba(255,220,64,0.30)',  duration:140 },
  boss_hit:     { color:'rgba(200,0,0,0.20)',     duration:70  },
};

export const PARTICLE_PRESETS = {
  attack: {
    count:8, speed:[2.5,5.0], spread:Math.PI*0.6, gravity:0.08,
    life:[0.6,1.0], decay:[0.04,0.07], size:[3,7],
    shape:'spark', colors:['#ffffff','#fffacc','#ffe860'], angle_base:-Math.PI*0.5,
  },
  fire: {
    count:18, speed:[1.8,4.0], spread:Math.PI*1.2, gravity:-0.06,
    life:[0.8,1.2], decay:[0.025,0.045], size:[4,10],
    shape:'circle', colors:['#ff8800','#ff4400','#ffcc00','#ff2200'], angle_base:-Math.PI*0.6,
  },
  water: {
    count:16, speed:[2.0,4.5], spread:Math.PI*1.5, gravity:0.12,
    life:[0.7,1.1], decay:[0.030,0.055], size:[4,9],
    shape:'drop', colors:['#30b4ff','#80d8ff','#b3e5fc','#4fc3f7'], angle_base:0,
  },
  earth: {
    count:14, speed:[2.5,5.0], spread:Math.PI*1.6, gravity:0.18,
    life:[0.6,1.0], decay:[0.035,0.06], size:[5,12],
    shape:'polygon', colors:['#88cc44','#ccee88','#d4a017','#8bc34a'], angle_base:0,
  },
  wind: {
    count:14, speed:[3.0,5.5], spread:Math.PI*1.0, gravity:-0.03,
    life:[0.8,1.2], decay:[0.025,0.04], size:[3,8],
    shape:'spark', colors:['#44ffaa','#aaffdd','#80ffcc','#ccffee'],
    angle_base:-Math.PI*0.4, wind_drift:true,
  },
  light: {
    count:20, speed:[2.0,5.0], spread:Math.PI*2, gravity:0,
    life:[0.5,0.9], decay:[0.04,0.07], size:[3,8],
    shape:'star', colors:['#ffe860','#fffacc','#ffffff','#fff176'], angle_base:0,
  },
  dark: {
    count:16, speed:[1.5,4.0], spread:Math.PI*2, gravity:0.04,
    life:[0.9,1.3], decay:[0.025,0.04], size:[4,10],
    shape:'circle', colors:['#c060ff','#e0a0ff','#9c27b0','#880088'], angle_base:0,
  },
  buff: {
    count:12, speed:[0.8,2.0], spread:Math.PI*0.5, gravity:-0.05,
    life:[1.0,1.6], decay:[0.018,0.030], size:[4,8],
    shape:'diamond', colors:['#4090ff','#90caff','#ffffff','#80d8ff'], angle_base:-Math.PI*0.8,
  },
  debuff: {
    count:10, speed:[1.5,3.0], spread:Math.PI*0.8, gravity:0.06,
    life:[0.8,1.2], decay:[0.028,0.045], size:[3,7],
    shape:'spark', colors:['#c060ff','#880088','#aa44cc','#dd99ff'], angle_base:Math.PI*0.5,
  },
  heal: {
    count:10, speed:[0.5,1.5], spread:Math.PI*0.4, gravity:-0.04,
    life:[1.2,1.8], decay:[0.015,0.025], size:[5,9],
    shape:'plus', colors:['#38e060','#80ff98','#a5d6a7','#66bb6a'], angle_base:-Math.PI*0.9,
  },
  charge_attack: {
    count:30, speed:[3.0,7.0], spread:Math.PI*2, gravity:0.04,
    life:[1.0,1.8], decay:[0.020,0.035], size:[5,14],
    shape:'star', colors:['#f0c030','#ffe860','#ffffff','#ff9020','#ffcc00'], angle_base:0,
  },
};

// ── SLASH PRESETS ─────────────────────────────────────────────────────────────
// angle: radians of the slash direction
// curvature: how much the Bezier control point bends the line (0=straight)
// taper: 0=uniform thickness, 1=needle-sharp at both ends
// DA/TA use opposing angles so cuts clearly look separate
export const SLASH_PRESETS = {
  // NORMAL — single long diagonal, top-left → bottom-right
  normal: [
    { angle: -0.55, offset:{x:0,y:0}, delay:0, length:0.85, thickness:5.5, color:'#ffffff', curvature:18, taper:0.85 },
  ],
  // DA — two cuts at sharply OPPOSING angles (cross pattern)
  // slash 1: top-right → bottom-left (\)
  // slash 2: top-left → bottom-right (/) after 300ms — clear cross
  da: [
    { angle: -0.55, offset:{x:-10,y:-8}, delay:0,   length:0.82, thickness:5.5, color:'#ffffff',  curvature:16, taper:0.85 },
    { angle:  0.55, offset:{x: 10,y:-8}, delay:300, length:0.80, thickness:5.0, color:'#ffd080',  curvature:14, taper:0.85 },
  ],
  // TA — three slashes in a fan, each 120° apart visually
  // slash 1: steep diagonal (\)
  // slash 2: near-horizontal (—)
  // slash 3: opposite steep (/)
  ta: [
    { angle: -0.65, offset:{x:-12,y:-10}, delay:0,   length:0.80, thickness:5.5, color:'#ffffff', curvature:15, taper:0.85 },
    { angle:  0.05, offset:{x:  0,y:  5}, delay:130, length:0.78, thickness:5.0, color:'#ffe0a0', curvature:12, taper:0.85 },
    { angle:  0.62, offset:{x: 12,y:-10}, delay:260, length:0.76, thickness:4.5, color:'#ffc040', curvature:14, taper:0.85 },
  ],
  // CA — big gold X
  ca: [
    { angle: -0.65, offset:{x:-14,y:-8}, delay:0,  length:0.95, thickness:8, color:'#f0c030', curvature:20, taper:0.80 },
    { angle:  0.65, offset:{x: 14,y:-8}, delay:45, length:0.95, thickness:8, color:'#ffe860', curvature:20, taper:0.80 },
  ],
};

export const DMG_NUMBER_STYLE = {
  normal: { color:'#ffffff', size:28, outline:'#333',  shadow:'rgba(0,0,0,0.8)'      },
  crit:   { color:'#ff9020', size:36, outline:'#800',  shadow:'rgba(200,80,0,0.8)'   },
  skill:  { color:'#80ccff', size:32, outline:'#003',  shadow:'rgba(0,40,100,0.8)'   },
  heal:   { color:'#38e060', size:30, outline:'#020',  shadow:'rgba(0,80,30,0.8)'    },
  boss_dmg:{ color:'#ff6060',size:26, outline:'#600',  shadow:'rgba(150,0,0,0.8)'    },
  ca:     { color:'#f0c030', size:40, outline:'#840',  shadow:'rgba(180,120,0,0.8)'  },
};

export function getSkillVFX(effect_type, element) {
  const el = (element||'FIRE').toUpperCase();
  switch (effect_type) {
    case 'DAMAGE': return { flash:FLASH.skill_damage, particles:(el.toLowerCase()||'fire'), target:'enemy', impact_ring:true,  impact_color:ELEM_VFX[el]?.primary||'#ff4400' };
    case 'BUFF':   return { flash:FLASH.skill_buff,   particles:'buff',   target:'ally',  impact_ring:false, impact_color:'#4090ff' };
    case 'DEBUFF': return { flash:FLASH.skill_debuff, particles:'debuff', target:'enemy', impact_ring:true,  impact_color:'#c060ff' };
    case 'HEAL':   return { flash:FLASH.skill_heal,   particles:'heal',   target:'ally',  impact_ring:false, impact_color:'#38e060' };
    default:       return { flash:FLASH.attack,       particles:'attack', target:'enemy', impact_ring:false, impact_color:'#ffffff' };
  }
}
