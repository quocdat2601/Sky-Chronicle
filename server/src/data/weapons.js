// ─────────────────────────────────────────────────────────────────────────────
// WEAPONS — Weapon instance data
//
// Each entry defines one weapon: base stats and which skills it carries.
// Skill metadata (skill_category, effect_id, tier) is co-located here for
// convenience — the engine only reads skill_type + magnitude fields.
//
// For future scale: split into weapons/fire.js, weapons/water.js etc.,
// or move to a database table (shape stays identical, source changes).
//
// Skill type definitions and tier thresholds → constants.js
// ─────────────────────────────────────────────────────────────────────────────

export const WEAPONS = [

  // ── FIRE ────────────────────────────────────────────────────────────────────
  {
    id: 'W001',
    name: 'Ember Blade',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2800,
    base_hp: 500,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 0.05 + 9×0.01 = 14%
      },
      {
        skill_type: 'CRITICAL_RATE', skill_category: null, effect_id: 'critical', tier: 'medium',
        skill_level: 5, magnitude_base: 0.03, magnitude_per_level: 0.005,
        // SL5 effective: 0.03 + 4×0.005 = 5%
      },
    ],
  },
  {
    id: 'W002',
    name: 'Inferno Rod',
    element: 'FIRE',
    rarity: 'SR',
    base_atk: 2200,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.01,
        // SL8 effective: 0.04 + 7×0.01 = 11%
      },
    ],
  },
  {
    id: 'W003',
    name: 'Pyre Axe',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 450,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% at full HP
      },
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.03, magnitude_per_level: 0.008,
        // SL5 effective: 0.03 + 4×0.008 = 6.2%
      },
    ],
  },
  {
    id: 'W019',
    name: 'Crimson Fist',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2830,
    base_hp: 450,
    skills: [
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
        // SL8 effective: 0.04 + 7×0.007 = 8.9%
      },
      {
        skill_type: 'CRITICAL_RATE', skill_category: null, effect_id: 'critical', tier: 'small',
        skill_level: 5, magnitude_base: 0.025, magnitude_per_level: 0.004,
      },
    ],
  },

  // ── WATER ───────────────────────────────────────────────────────────────────
  {
    id: 'W004',
    name: 'Tide Sword',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2750,
    base_hp: 550,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.008,
        // SL8 effective: 9.6%
      },
    ],
  },
  {
    id: 'W005',
    name: 'Deep Trident',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2850,
    base_hp: 480,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% at 1 HP
      },
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.03, magnitude_per_level: 0.008,
      },
    ],
  },
  {
    id: 'W018',
    name: 'Aqua Knuckles',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2780,
    base_hp: 495,
    skills: [
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.008,
        // SL10 effective: 12.2%
      },
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.025, magnitude_per_level: 0.007,
      },
    ],
  },

  // ── EARTH ───────────────────────────────────────────────────────────────────
  {
    id: 'W006',
    name: 'Terra Sword',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2800,
    base_hp: 520,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },
  {
    id: 'W007',
    name: 'Iron Axe',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 460,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'CHARGE_SPEED', skill_category: null, effect_id: 'prog', tier: 'medium',
        skill_level: 5, magnitude_base: 0.04, magnitude_per_level: 0.008,
      },
    ],
  },

  // ── WIND ────────────────────────────────────────────────────────────────────
  {
    id: 'W008',
    name: 'Gale Sword',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2750,
    base_hp: 510,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'CRITICAL_RATE', skill_category: null, effect_id: 'critical', tier: 'medium',
        skill_level: 7, magnitude_base: 0.04, magnitude_per_level: 0.006,
      },
    ],
  },
  {
    id: 'W009',
    name: 'Cyclone Axe',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 470,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
      },
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'small',
        skill_level: 6, magnitude_base: 0.03, magnitude_per_level: 0.008,
      },
    ],
  },
  {
    id: 'W011',
    name: 'Storm Bow',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2700,
    base_hp: 490,
    skills: [
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.008,
        // SL10 effective: 12.2%
      },
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.03, magnitude_per_level: 0.007,
      },
    ],
  },
  {
    id: 'W012',
    name: 'Tempest Lance',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2820,
    base_hp: 460,
    skills: [
      {
        skill_type: 'TA_RATE', skill_category: null, effect_id: 'ta', tier: 'medium',
        skill_level: 8, magnitude_base: 0.025, magnitude_per_level: 0.005,
        // SL8 effective: 6%
      },
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'small',
        skill_level: 5, magnitude_base: 0.02, magnitude_per_level: 0.004,
      },
    ],
  },

  // ── LIGHT ───────────────────────────────────────────────────────────────────
  {
    id: 'W010',
    name: 'Dawn Scepter',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2650,
    base_hp: 600,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },
  {
    id: 'W015',
    name: 'Radiant Grimoire',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2550,
    base_hp: 580,
    skills: [
      {
        skill_type: 'DMG_CAP_CA', skill_category: null, effect_id: 'cap', tier: 'big',
        skill_level: 10, magnitude_base: 0.08, magnitude_per_level: 0.012,
        // SL10 effective: 18.8% CA cap raise
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'small',
        skill_level: 5, magnitude_base: 0.02, magnitude_per_level: 0.005,
      },
    ],
  },
  {
    id: 'W016',
    name: 'Seraph Blade',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2720,
    base_hp: 500,
    skills: [
      {
        skill_type: 'ELEM_AMPLIFY', skill_category: null, effect_id: 'supp', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.005,
        // SL8 effective: 7.5% (only vs weak element)
      },
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.025, magnitude_per_level: 0.006,
      },
    ],
  },
  {
    id: 'W017',
    name: 'Celestial Staff',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2500,
    base_hp: 620,
    skills: [
      {
        skill_type: 'SUPPLEMENTAL', skill_category: null, effect_id: 'supp', tier: 'big',
        skill_level: 10, magnitude_base: 30000, magnitude_per_level: 2000,
        // SL10 effective: 48000 flat dmg per hit — magnitude is NOT a percentage
      },
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'small',
        skill_level: 5, magnitude_base: 0.03, magnitude_per_level: 0.007,
      },
    ],
  },

  // ── DARK ────────────────────────────────────────────────────────────────────
  {
    id: 'W013',
    name: 'Void Spear',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2880,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },
  {
    id: 'W014',
    name: 'Abyss Tome',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2600,
    base_hp: 560,
    skills: [
      {
        skill_type: 'DMG_CAP_NA', skill_category: null, effect_id: 'cap', tier: 'medium',
        skill_level: 10, magnitude_base: 0.04, magnitude_per_level: 0.006,
        // SL10 effective: 9.4% NA cap raise
      },
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'small',
        skill_level: 6, magnitude_base: 0.03, magnitude_per_level: 0.007,
      },
    ],
  },
  {
    id: 'W020',
    name: 'Obsidian Edge',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2920,
    base_hp: 430,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'DMG_CAP_NA', skill_category: null, effect_id: 'cap', tier: 'small',
        skill_level: 5, magnitude_base: 0.02, magnitude_per_level: 0.004,
      },
    ],
  },
];