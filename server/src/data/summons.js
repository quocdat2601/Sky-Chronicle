// ─────────────────────────────────────────────────────────────────────────────
// SUMMONS — Omega (×6) and Optimus (×6) summon stones
// All call effects and aura text taken directly from gbf.wiki screenshots.
//
// call.effect_by_uncap: per-uncap effects used in UI description display.
// For the engine we use the 0★ base effect (most common battle state).
// uncap_stars default = 3 (FLB).
// ─────────────────────────────────────────────────────────────────────────────

export const SUMMONS = [

  // ═══════════════════════════════════════════════════════════════════════════
  // OMEGA SUMMONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'S001',
    name: 'Colossus Omega',
    element: 'FIRE',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Ironflame's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Iron Judgment',
      // 0★: DMG + DEF Down 15%
      // 4★: DMG + DEF Down 15% + Shield (1500) to all allies
      // 5★: DMG + DEF Down 20% + Shield (2000) to all allies
      description_by_uncap: {
        0: 'Massive Fire DMG to all foes. Inflict DEF Down (15%).',
        4: 'Massive Fire DMG to all foes. Inflict DEF Down (15%). All allies gain Shield (1500).',
        5: 'Massive Fire DMG to all foes. Inflict DEF Down (20%). All allies gain Shield (2000).',
      },
      dmg_multiplier: 5.5,
      element: 'FIRE',
      // Base effect (0★)
      effect: { type: 'DEF_DOWN', amount: -0.15, duration: 3, target: 'foe' },
    },
  },

  {
    id: 'S002',
    name: 'Leviathan Omega',
    element: 'WATER',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Oceansoul's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Perilous Tidefall',
      // 0★: DMG + DEF Down 15%
      // 4★: DMG + DEF Down 15% + Water ATK Up 20% to all allies
      // 5★: DMG + DEF Down 20% + Water ATK Up 30% to all allies
      description_by_uncap: {
        0: 'Massive Water DMG to all foes. Inflict DEF Down (15%).',
        4: 'Massive Water DMG to all foes. Inflict DEF Down (15%). All allies gain Water ATK Up (20%).',
        5: 'Massive Water DMG to all foes. Inflict DEF Down (20%). All allies gain Water ATK Up (30%).',
      },
      dmg_multiplier: 5.5,
      element: 'WATER',
      effect: { type: 'DEF_DOWN', amount: -0.15, duration: 3, target: 'foe' },
    },
  },

  {
    id: 'S003',
    name: 'Yggdrasil Omega',
    element: 'EARTH',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Lifetree's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Luminox',
      // 0★: DMG + Healing Up 10% + Healing Cap Up 10% to all allies
      // 4★: DMG + Healing Up 10% + Healing Cap Up 10% + 1 random buff to all allies
      // 5★: DMG + Healing Up 10% + Healing Cap Up 10% + 2 random buffs to all allies
      description_by_uncap: {
        0: 'Massive Earth DMG to all foes. All allies gain Healing Up (10%) and Healing Cap Up (10%).',
        4: 'Massive Earth DMG to all foes. All allies gain Healing Up (10%), Healing Cap Up (10%), and 1 random buff.',
        5: 'Massive Earth DMG to all foes. All allies gain Healing Up (10%), Healing Cap Up (10%), and 2 random buffs.',
      },
      dmg_multiplier: 5.5,
      element: 'EARTH',
      // Simplified: ATK Up as proxy for healing/random buffs
      effect: { type: 'ATK_UP', amount: 0.10, duration: 3, target: 'party' },
    },
  },

  {
    id: 'S004',
    name: 'Tiamat Omega',
    element: 'WIND',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Stormwyrm's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Tempest',
      // 0★: DMG + ATK Down 15%
      // 4★: DMG + ATK Down 15% + Mirror Image (1 time) to all allies
      // 5★: DMG + ATK Down 20% + Mirror Image (1 time) to all allies
      description_by_uncap: {
        0: 'Massive Wind DMG to all foes. Inflict ATK Down (15%).',
        4: 'Massive Wind DMG to all foes. Inflict ATK Down (15%). All allies gain Mirror Image (1 time).',
        5: 'Massive Wind DMG to all foes. Inflict ATK Down (20%). All allies gain Mirror Image (1 time).',
      },
      dmg_multiplier: 5.5,
      element: 'WIND',
      effect: { type: 'ATK_DOWN', amount: -0.15, duration: 3, target: 'foe' },
    },
  },

  {
    id: 'S005',
    name: 'Luminiera Omega',
    element: 'LIGHT',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Knightcode's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Holy Pillar',
      // 0★: DMG + slight chance to remove 1 buff
      // 4★: DMG + slight chance to remove 1 buff + Light ATK Up 20% to all allies
      // 5★: DMG + remove 1 buff + Light ATK Up 30% to all allies
      description_by_uncap: {
        0: 'Massive Light DMG to all foes. Slight chance to remove 1 buff.',
        4: 'Massive Light DMG to all foes. Slight chance to remove 1 buff. All allies gain Light ATK Up (20%).',
        5: 'Massive Light DMG to all foes. Remove 1 buff. All allies gain Light ATK Up (30%).',
      },
      dmg_multiplier: 5.5,
      element: 'LIGHT',
      // Simplified: ATK Up as proxy for the ATK Up effect at 4★
      effect: { type: 'ATK_UP', amount: 0.20, duration: 3, target: 'party' },
    },
  },

  {
    id: 'S006',
    name: 'Celeste Omega',
    element: 'DARK',
    rarity: 'SSR',
    aura_type: 'omega',
    aura_label: "Boost to Mistfall's weapon skills",
    aura_value:     [0.50, 0.60, 0.80, 1.00, 1.20, 1.40],
    sub_aura_value: [0.25, 0.30, 0.40, 0.50, 0.60, 0.70],
    uncap_stars: 3,
    call: {
      name: 'Dark Abyss',
      // 0★: DMG + Healing Specs Down 50%
      // 4★: DMG + Healing Specs Down 50% + Blinded
      // 5★: DMG + Healing Specs Down 50% + Blinded + Accuracy Lowered 30%
      description_by_uncap: {
        0: 'Massive Dark DMG to all foes. Inflict Healing Specs Down (50%).',
        4: 'Massive Dark DMG to all foes. Inflict Healing Specs Down (50%) and Blinded.',
        5: 'Massive Dark DMG to all foes. Inflict Healing Specs Down (50%), Blinded, and Accuracy Lowered (30%).',
      },
      dmg_multiplier: 5.5,
      element: 'DARK',
      // Healing Specs Down reduces enemy healing — map to ATK_DOWN as closest proxy
      effect: { type: 'ATK_DOWN', amount: -0.25, duration: 3, target: 'foe' },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMUS SUMMONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'S007',
    name: 'Agni',
    element: 'FIRE',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Fire's, Hellfire's, and Inferno's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Hellfire',
      // 0★: DMG + Burned (5000)
      // 4★: 400% Fire DMG (cap ~840k) + Burned (5000) + Jammed to all allies
      // 5★: same as 4★
      description_by_uncap: {
        0: 'Massive Fire DMG to all foes. Inflict Burned (5000).',
        4: '400% Fire DMG to all foes (Cap ~840,000). Inflict Burned (5000). All allies gain Jammed.',
        5: '400% Fire DMG to all foes (Cap ~840,000). Inflict Burned (5000). All allies gain Jammed.',
      },
      dmg_multiplier: 5.5,
      element: 'FIRE',
      // Burned = DoT damage to enemy
      effect: { type: 'BURN', damage: 5000, duration: 3, target: 'foe' },
    },
  },

  {
    id: 'S008',
    name: 'Varuna',
    element: 'WATER',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Water's, Tsunami's, and Hoarfrost's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Brahmastra',
      // 0★: DMG + Putrefied (5000)
      // 4★: 400% Water DMG (cap ~860k) + Putrefied (5000) + TA Up 15% to all allies
      // 5★: 400% Water DMG (cap ~860k) + Putrefied (5000) + TA Up 30% to all allies
      description_by_uncap: {
        0: 'Massive Water DMG to all foes. Inflict Putrefied (5000).',
        4: '400% Water DMG to all foes (Cap ~860,000). Inflict Putrefied (5000). All allies gain TA Up (15%).',
        5: '400% Water DMG to all foes (Cap ~860,000). Inflict Putrefied (5000). All allies gain TA Up (30%).',
      },
      dmg_multiplier: 5.5,
      element: 'WATER',
      effect: { type: 'ATK_DOWN', amount: -0.25, duration: 3, target: 'foe' },
    },
  },

  {
    id: 'S009',
    name: 'Titan',
    element: 'EARTH',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Earth's, Mountain's, and Terra's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Titanomachy',
      // 0★: DMG + Guts (25% HP / 1 time) to all allies
      // 4★: 400% Earth DMG (cap ~860k) + Guts (1 time) + Armored (50%/20%) to all allies
      // 5★: 400% Earth DMG (cap ~860k) + Guts (1 time) + Armored (100%/25%) to all allies
      description_by_uncap: {
        0: 'Massive Earth DMG to all foes. All allies gain Guts (25% HP / 1 time).',
        4: '400% Earth DMG to all foes (Cap ~860,000). All allies gain Guts (1 time) and Armored (50% / 20%).',
        5: '400% Earth DMG to all foes (Cap ~860,000). All allies gain Guts (1 time) and Armored (100% / 25%).',
      },
      dmg_multiplier: 5.5,
      element: 'EARTH',
      // Guts = survive lethal hit — map to DEF_UP as closest proxy
      effect: { type: 'DEF_UP', amount: 0.25, duration: 3, target: 'party' },
    },
  },

  {
    id: 'S010',
    name: 'Zephyrus',
    element: 'WIND',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Wind's, Whirlwind's, and Ventosus's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Turbulent Gale',
      // 0★: DMG + remove 1 buff from all foes
      // 4★: 400% Wind DMG (cap ~860k) + remove 1 buff + Charge Bar +10% to all allies
      // 5★: 400% Wind DMG (cap ~860k) + remove 1 buff + Charge Bar +25% to all allies
      description_by_uncap: {
        0: 'Massive Wind DMG to all foes and remove 1 buff.',
        4: '400% Wind DMG to all foes (Cap ~860,000) and remove 1 buff. All allies gain Charge Bar +10%.',
        5: '400% Wind DMG to all foes (Cap ~860,000) and remove 1 buff. All allies gain Charge Bar +25%.',
      },
      dmg_multiplier: 5.5,
      element: 'WIND',
      // Charge bar gain — map to ATK_UP as closest proxy in our engine
      effect: { type: 'ATK_UP', amount: 0.10, duration: 3, target: 'party' },
    },
  },

  {
    id: 'S011',
    name: 'Zeus',
    element: 'LIGHT',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Light's, Thunder's, and Zion's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Keraunos',
      // 0★: DMG + Shield (1000) to all allies
      // 4★: 400% Light DMG (cap ~860k) + Shield (3000) to all allies
      // 5★: 400% Light DMG (cap ~860k) + Shield (5000) to all allies
      description_by_uncap: {
        0: 'Massive Light DMG to all foes. All allies gain Shield (1000).',
        4: '400% Light DMG to all foes (Cap ~860,000). All allies gain Shield (3000).',
        5: '400% Light DMG to all foes (Cap ~860,000). All allies gain Shield (5000).',
      },
      dmg_multiplier: 5.5,
      element: 'LIGHT',
      // Shield — map to DEF_UP as closest proxy
      effect: { type: 'DEF_UP', amount: 0.20, duration: 3, target: 'party' },
    },
  },

  {
    id: 'S012',
    name: 'Hades',
    element: 'DARK',
    rarity: 'SSR',
    aura_type: 'optimus',
    aura_label: "Boost to Dark's, Hatred's, and Oblivion's weapon skills",
    aura_value:     [0.80, 0.90, 1.00, 1.20, 1.40, 1.50],
    sub_aura_value: [0.40, 0.45, 0.50, 0.60, 0.70, 0.75],
    uncap_stars: 3,
    call: {
      name: 'Thanatos',
      // 0★: DMG + Sleep on all foes
      // 4★: 400% Dark DMG (cap ~860k) + Sleep + Charge Bar +10% to all allies
      // 5★: 400% Dark DMG (cap ~860k) + Sleep + Charge Bar +20% to all allies
      description_by_uncap: {
        0: 'Massive Dark DMG to all foes. Inflict Sleep.',
        4: '400% Dark DMG to all foes (Cap ~860,000). Inflict Sleep. All allies gain Charge Bar +10%.',
        5: '400% Dark DMG to all foes (Cap ~860,000). Inflict Sleep. All allies gain Charge Bar +20%.',
      },
      dmg_multiplier: 5.5,
      element: 'DARK',
      effect: { type: 'ATK_DOWN', amount: -0.25, duration: 2, target: 'foe' },
    },
  },
];