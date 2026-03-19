// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — Game rules and type definitions
//
// This file defines WHAT things are, not what specific weapons/characters exist.
// Changes here affect the whole game engine (formulas, icons, validation).
// Never put instance data (specific weapon records) here.
// ─────────────────────────────────────────────────────────────────────────────

// ── ELEMENTS ─────────────────────────────────────────────────────────────────

export const ELEMENTS = {
  FIRE:  'FIRE',
  WATER: 'WATER',
  EARTH: 'EARTH',
  WIND:  'WIND',
  LIGHT: 'LIGHT',
  DARK:  'DARK',
};

// Strong = 1.5× damage. Weak = 0.75× damage. Neutral = 1.0×.
export const ELEMENT_ADVANTAGE = {
  FIRE:  { strong: 'WIND',  weak: 'WATER' },
  WATER: { strong: 'FIRE',  weak: 'EARTH' },
  EARTH: { strong: 'WATER', weak: 'WIND'  },
  WIND:  { strong: 'EARTH', weak: 'FIRE'  },
  LIGHT: { strong: 'DARK',  weak: 'DARK'  },
  DARK:  { strong: 'LIGHT', weak: 'LIGHT' },
};

// ── ELEMENT PREFIXES ──────────────────────────────────────────────────────────
// Drives auto-generated skill names: `${prefix[skill_category]}'s ${suffix}`
// e.g. WATER + ATK_OMEGA → "Oceansoul's Might"
//      DARK  + ENMITY_EX → "Oblivion's Enmity"
export const ELEMENT_PREFIXES = {
  FIRE:  { normal: 'Inferno',   omega: 'Ironflame',  ex: 'Blaze'     },
  WATER: { normal: 'Hoarfrost', omega: 'Oceansoul',  ex: 'Tsunami'   },
  EARTH: { normal: 'Terra',     omega: 'Lifetree',   ex: 'Gaia'      },
  WIND:  { normal: 'Ventosus',  omega: 'Stormwyrm',  ex: 'Gale'      },
  LIGHT: { normal: 'Celestia',  omega: 'Knightcode', ex: 'Glory'     },
  DARK:  { normal: 'Hatred',    omega: 'Mistfall',   ex: 'Oblivion'  },
};

// ── SKILL NAME HELPER ─────────────────────────────────────────────────────────
// Used by the UI to display the full GBF-style skill name on weapon cards.
export function getSkillName(element, skill_type) {
  const def = SKILL_TYPES[skill_type];
  if (!def) return 'Unknown Skill';
  const prefixes = ELEMENT_PREFIXES[element];
  // Utility skills (skill_category: null) still receive the element prefix when
  // they have a suffix — e.g. CRITICAL_RATE → "Inferno's Verity".
  // Only fall back to bare label/suffix when there are no prefixes at all.
  if (!prefixes) return def.suffix ?? def.label;
  if (def.skill_category) return `${prefixes[def.skill_category]}'s ${def.suffix}`;
  // Utility: use the 'normal' prefix bucket as the element identifier
  return def.suffix ? `${prefixes.normal}'s ${def.suffix}` : (def.label ?? 'Unknown Skill');
}

// ── WEAPON SKILL TYPE REGISTRY ────────────────────────────────────────────────
// Single source of truth for every skill_type the engine recognises.
//
// Fields:
//   label          — display name shown in UI
//   suffix         — the word after the element prefix in the full skill name
//   skill_category — ATK formula bucket: 'normal' | 'omega' | 'ex' | null (utility)
//   effect_id      — icon system key → SVG effect badge in gbf_weapon_skill_icons
//   icon           — descriptor for WeaponSkillIcon component:
//                      { type:'single', svg:'might' }
//                      { type:'dual', svg:'might', svg2:'hp' }
//                      { type:'restraint' }   ← composite DA+crit badge
//   description    — tooltip copy shown to player
//   is_pct         — true = magnitude is a %; false = flat value (e.g. supplemental)
//   has_tier       — true = Small/Medium/Big/Massive tier arrows apply
//   hp_conditional — true = value changes with current HP (stamina/enmity)
//
// Rule: every effect that fits a multiplier bracket exists in all 3 variants
// (NORMAL / OMEGA / EX). Utility effects (crit, DA, cap…) have no bracket
// and therefore no _NORMAL/_OMEGA/_EX suffix — one entry covers all weapons.
// ─────────────────────────────────────────────────────────────────────────────
export const SKILL_TYPES = {

  // ── ATK (Might) — all 3 brackets ──────────────────────────────────────────
  ATK_NORMAL: {
    label: 'Might', suffix: 'Might',
    skill_category: 'normal', multiplierType: 'normal', effect_id: 'might',
    icon: { type: 'single', svg: 'might' },
    description: 'Flat ATK bonus to elemental allies. Amplified by Optimus/Six-Dragon summons.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  ATK_OMEGA: {
    label: 'Omega Might', suffix: 'Might',
    skill_category: 'omega', multiplierType: 'omega', effect_id: 'might',
    icon: { type: 'single', svg: 'might' },
    description: 'Flat ATK bonus. Amplified by the elemental Omega summon (e.g. Colossus, Varuna).',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  ATK_EX: {
    label: 'EX Might', suffix: 'Might',
    skill_category: 'ex', multiplierType: 'ex', effect_id: 'might',
    icon: { type: 'single', svg: 'might' },
    description: 'Flat ATK bonus in the EX multiplier bracket. Not amplified by summons.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },

  // ── Stamina (high HP → ATK up) — all 3 brackets ───────────────────────────
  STAMINA_NORMAL: {
    label: 'Stamina', suffix: 'Stamina',
    skill_category: 'normal', multiplierType: 'normal', effect_id: 'stamina',
    icon: { type: 'single', svg: 'stamina' },
    description: 'ATK scales UP with remaining HP. Full bonus at 100% HP. Amplified by Optimus summons.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },
  STAMINA_OMEGA: {
    label: 'Omega Stamina', suffix: 'Stamina',
    skill_category: 'omega', multiplierType: 'omega', effect_id: 'stamina',
    icon: { type: 'single', svg: 'stamina' },
    description: 'ATK scales UP with remaining HP. Amplified by the elemental Omega summon.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },
  STAMINA_EX: {
    label: 'EX Stamina', suffix: 'Stamina',
    skill_category: 'ex', multiplierType: 'ex', effect_id: 'stamina',
    icon: { type: 'single', svg: 'stamina' },
    description: 'ATK scales UP with remaining HP. In the EX bracket; not amplified by summons.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },

  // ── Enmity (low HP → ATK up) — all 3 brackets ─────────────────────────────
  ENMITY_NORMAL: {
    label: 'Enmity', suffix: 'Enmity',
    skill_category: 'normal', multiplierType: 'normal', effect_id: 'enmity',
    icon: { type: 'single', svg: 'enmity' },
    description: 'ATK scales UP as HP drops. Maximum bonus near 1% HP. Amplified by Optimus summons.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },
  ENMITY_OMEGA: {
    label: 'Omega Enmity', suffix: 'Enmity',
    skill_category: 'omega', multiplierType: 'omega', effect_id: 'enmity',
    icon: { type: 'single', svg: 'enmity' },
    description: 'ATK scales UP as HP drops. Amplified by the elemental Omega summon.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },
  ENMITY_EX: {
    label: 'EX Enmity', suffix: 'Enmity',
    skill_category: 'ex', multiplierType: 'ex', effect_id: 'enmity',
    icon: { type: 'single', svg: 'enmity' },
    description: 'ATK scales UP as HP drops. In the EX bracket; not amplified by summons.',
    is_pct: true, has_tier: true, hp_conditional: true,
  },

  // ── Majesty (ATK + HP) — all 3 brackets ───────────────────────────────────
  MAJESTY_NORMAL: {
    label: 'Majesty', suffix: 'Majesty',
    skill_category: 'normal', multiplierType: 'normal', effect_id: 'might',
    icon: { type: 'dual', svg: 'might', svg2: 'hp' },
    description: 'Boosts both ATK and max HP of elemental allies. Amplified by Optimus summons.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  MAJESTY_OMEGA: {
    label: 'Omega Majesty', suffix: 'Majesty',
    skill_category: 'omega', multiplierType: 'omega', effect_id: 'might',
    icon: { type: 'dual', svg: 'might', svg2: 'hp' },
    description: 'Boosts both ATK and max HP. Amplified by the elemental Omega summon.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  MAJESTY_EX: {
    label: 'EX Majesty', suffix: 'Majesty',
    skill_category: 'ex', multiplierType: 'ex', effect_id: 'might',
    icon: { type: 'dual', svg: 'might', svg2: 'hp' },
    description: 'Boosts both ATK and max HP. In the EX bracket; not amplified by summons.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },

  // ── HP pool (Aegis) — all 3 brackets ──────────────────────────────────────
  HP_BOOST: {
    label: 'HP', suffix: 'Aegis',
    skill_category: 'normal', multiplierType: 'normal', effect_id: 'hp',
    icon: { type: 'single', svg: 'hp' },
    description: 'Boosts max HP of all allies (Normal bracket). Applied once when joining a raid.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  HP_BOOST_OMEGA: {
    label: 'Omega HP', suffix: 'Aegis',
    skill_category: 'omega', multiplierType: 'omega', effect_id: 'hp',
    icon: { type: 'single', svg: 'hp' },
    description: 'Boosts max HP of all allies (Omega bracket). Amplified by the elemental Omega summon.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  HP_BOOST_EX: {
    label: 'EX HP', suffix: 'Aegis',
    skill_category: 'ex', multiplierType: 'ex', effect_id: 'hp',
    icon: { type: 'single', svg: 'hp' },
    description: 'Boosts max HP of all allies (EX bracket). Not amplified by summons.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },

  // ── Utility — no bracket (skill_category: null) ───────────────────────────
  // These don't fit into Normal/Omega/EX formula buckets; one key covers all.

  CRITICAL_RATE: {
    label: 'Critical', suffix: 'Verity',
    skill_category: null, multiplierType: null, effect_id: 'critical',
    icon: { type: 'single', svg: 'critical' },
    description: 'Adds to crit hit chance. Each hit rolls independently. Crits deal ×1.5 damage.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  DA_RATE: {
    label: 'DA Rate', suffix: 'Courage',
    skill_category: null, multiplierType: null, effect_id: 'da',
    icon: { type: 'single', svg: 'da' },
    description: 'Chance to attack twice per turn. Each extra hit rolls its own crit.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  TA_RATE: {
    label: 'TA Rate', suffix: 'Trium',
    skill_category: null, multiplierType: null, effect_id: 'ta',
    icon: { type: 'single', svg: 'ta' },
    description: 'Chance to attack three times per turn. Only rolls if DA already proc\'d.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // Trium = DA + TA simultaneously (multiattack rate) — 3-bolt icon
  TRIUM: {
    label: 'Trium', suffix: 'Trium',
    skill_category: null, multiplierType: null, effect_id: 'trium',
    icon: { type: 'single', svg: 'trium' },
    description: 'Boosts both Double Attack and Triple Attack rate simultaneously.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // Restraint = DA Rate + Crit Rate — composite 2-bolt + star icon
  RESTRAINT: {
    label: 'Restraint', suffix: 'Restraint',
    skill_category: null, multiplierType: null, effect_id: 'restraint',
    icon: { type: 'restraint' },
    description: 'Boosts Double Attack Rate and Critical Hit Rate simultaneously.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // Celere = ATK + Crit — dual icon
  CELERE: {
    label: 'Celere', suffix: 'Celere',
    skill_category: null, multiplierType: null, effect_id: 'might',
    icon: { type: 'dual', svg: 'might', svg2: 'critical' },
    description: 'Boosts ATK and Critical Rate simultaneously.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // Tyranny = big ATK boost but reduces HP — dual icon
  TYRANNY: {
    label: 'Tyranny', suffix: 'Tyranny',
    skill_category: null, multiplierType: null, effect_id: 'might',
    icon: { type: 'dual', svg: 'might', svg2: 'enmity' },
    description: 'Greatly boosts ATK but reduces party max HP.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  CHARGE_SPEED: {
    label: 'Charge Speed', suffix: 'Alacrity',
    skill_category: null, multiplierType: null, effect_id: 'prog',
    icon: { type: 'single', svg: 'prog' },
    description: 'Increases charge bar gain per turn.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // ── Damage cap raising ────────────────────────────────────────────────────
  DMG_CAP_NA: {
    label: 'NA DMG Cap', suffix: 'Exceed',
    skill_category: null, multiplierType: null, effect_id: 'cap',
    icon: { type: 'single', svg: 'cap' },
    description: 'Raises normal attack soft cap. All weapons share a +20% weapon pool limit.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  DMG_CAP_CA: {
    label: 'CA DMG Cap', suffix: 'Exceed',
    skill_category: null, multiplierType: null, effect_id: 'cap',
    icon: { type: 'single', svg: 'cap' },
    description: 'Raises charge attack soft cap. All weapons share a +100% weapon pool limit.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  // ── Post-formula additions ─────────────────────────────────────────────────
  ELEM_AMPLIFY: {
    label: 'Elem. Amplify', suffix: 'Supplement',
    skill_category: null, multiplierType: null, effect_id: 'supp',
    icon: { type: 'single', svg: 'supp' },
    description: 'Amplifies superior elemental damage. Only applies vs weak element. Cap 20%.',
    is_pct: true, has_tier: true, hp_conditional: false,
  },
  SUPPLEMENTAL: {
    label: 'Supp DMG', suffix: 'Supplement',
    skill_category: null, multiplierType: null, effect_id: 'supp',
    icon: { type: 'single', svg: 'supp' },
    description: 'Adds flat damage per hit after all formula calculations. Immune to DEF and caps.',
    is_pct: false, has_tier: true, hp_conditional: false,
  },
};

// ── SKILL TIERS ───────────────────────────────────────────────────────────────
// Maps tier name → number of upward arrows in the icon badge.
// Approximate effective % at SL10 for ATK skills:
//   small   ~3–5%    (1 arrow)
//   medium  ~6–9%    (2 arrows)
//   big     ~10–14%  (3 arrows)
//   massive ~15%+    (4 arrows)
export const SKILL_TIERS = {
  small:   { arrows: 1, label: 'Small'   },
  medium:  { arrows: 2, label: 'Medium'  },
  big:     { arrows: 3, label: 'Big'     },
  massive: { arrows: 4, label: 'Massive' },
};

// ── CHARACTER TYPES ───────────────────────────────────────────────────────────
export const CHARACTER_TYPES = {
  ATTACK:  { label: 'Attack',  icon: '⚔'  },
  DEFENSE: { label: 'Defense', icon: '🛡'  },
  HEAL:    { label: 'Heal',    icon: '💚'  },
  BALANCE: { label: 'Balance', icon: '⚖'  },
};

// ── RARITY ────────────────────────────────────────────────────────────────────
export const RARITIES = {
  SSR: { stars: 3, label: 'SSR' },
  SR:  { stars: 2, label: 'SR'  },
  R:   { stars: 1, label: 'R'   },
};

// ── ABILITY EFFECT TYPES ──────────────────────────────────────────────────────
export const ABILITY_EFFECT_TYPES = {
  DAMAGE: 'DAMAGE',
  BUFF:   'BUFF',
  DEBUFF: 'DEBUFF',
  HEAL:   'HEAL',
};