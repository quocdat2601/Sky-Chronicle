// ─────────────────────────────────────────────────────────────────────────────
// catalog.js — Re-export barrel
//
// All data now lives in its dedicated file:
//   constants.js   → SKILL_TYPES, SKILL_TIERS, ELEMENT_PREFIXES, ELEMENTS,
//                    CHARACTER_TYPES, RARITIES, ABILITY_EFFECT_TYPES,
//                    getSkillName()
//   weapons.js     → WEAPONS[]
//   characters.js  → CHARACTERS[]
//   bosses.js      → BOSSES[]
//
// Import from the source files directly for tree-shaking.
// Import from here for convenience (e.g. in scripts that need everything).
// ─────────────────────────────────────────────────────────────────────────────

export {
  ELEMENTS,
  ELEMENT_PREFIXES,
  ELEMENT_ADVANTAGE,
  SKILL_TYPES,
  SKILL_TIERS,
  CHARACTER_TYPES,
  RARITIES,
  ABILITY_EFFECT_TYPES,
  getSkillName,
} from './constants.js';

export { SUMMONS }    from './summons.js';
export { WEAPONS }    from './weapons.js';
export { CHARACTERS } from './characters.js';
export { BOSSES }     from './bosses.js';
export { MC_CLASSES, MC_CLASS_MAP, MC_DEFAULT_CLASS_ID } from './mcClasses.js';