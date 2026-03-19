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
  // ── FIRE (GBF) ──────────────────────────────────────────────────────────────

  // Colossus Cane Omega — signature M1 Omega ATK stick for Fire Magna grids
  {
    id: 'W021',
    name: 'Colossus Cane Omega',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 420,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% — Ironflame's Might
      },
    ],
  },

  // Colossus Blade Omega — high-ATK Omega sword, single massive Might skill
  {
    id: 'W022',
    name: 'Colossus Blade Omega',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 380,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Ironflame's Might II
      },
    ],
  },

  // Shiva's Trident — Primal Normal grid anchor, dual Might + Enmity Normal
  {
    id: 'W023',
    name: "Shiva's Trident",
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Inferno's Might III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% at low HP
      },
    ],
  },

  // Ixaba — premium Fire Primal sword, Stamina + Verity (crit) dual Normal
  {
    id: 'W024',
    name: 'Ixaba',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 3100,
    base_hp: 350,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% at full HP — Inferno's Stamina
      },
      {
        skill_type: 'CRITICAL_RATE', skill_category: null, effect_id: 'critical', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.008,
        // SL10 effective: 12.2% crit — Inferno's Verity
      },
    ],
  },

  // Grimnir Cane (Fire) — Majesty Normal + DA Rate, Optimus-boosted ATK+HP
  {
    id: 'W025',
    name: 'Grimnir Cane (Fire)',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2850,
    base_hp: 500,
    skills: [
      {
        skill_type: 'MAJESTY_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% ATK+HP — Inferno's Majesty
      },
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Xeno Ifrit Claw — Xeno Clash EX weapon, primary EX Voltage source for Fire
  {
    id: 'W026',
    name: 'Xeno Ifrit Claw',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% EX ATK — Blaze's Might II (Voltage)
      },
    ],
  },

  // Ushumgal — gacha EX sword with ATK EX + CA DMG Cap
  {
    id: 'W027',
    name: 'Ushumgal',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 410,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% EX ATK — Blaze's Might
      },
      {
        skill_type: 'DMG_CAP_CA', skill_category: null, effect_id: 'cap', tier: 'medium',
        skill_level: 8, magnitude_base: 0.06, magnitude_per_level: 0.01,
        // SL8: 12% CA cap raise
      },
    ],
  },

  // True Phantom Demon Blade — Xeno 5★ upgrade, EX Enmity + Charge Speed
  {
    id: 'W028',
    name: 'True Phantom Demon Blade',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 3150,
    base_hp: 360,
    skills: [
      {
        skill_type: 'ENMITY_EX', skill_category: 'ex', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // SL10 effective: 18.7% EX Enmity — Blaze's Enmity
      },
      {
        skill_type: 'CHARGE_SPEED', skill_category: null, effect_id: 'prog', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Prometheus Gauntlet — Omega Stamina + Trium utility for Magna builds
  {
    id: 'W029',
    name: 'Prometheus Gauntlet',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2870,
    base_hp: 460,
    skills: [
      {
        skill_type: 'STAMINA_OMEGA', skill_category: 'omega', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% Omega Stamina — Ironflame's Stamina
      },
      {
        skill_type: 'TRIUM', skill_category: null, effect_id: 'trium', tier: 'small',
        skill_level: 5, magnitude_base: 0.02, magnitude_per_level: 0.004,
      },
    ],
  },

  // Colossus Fist Omega — Omega Enmity knuckles for low-HP Magna setups
  {
    id: 'W030',
    name: 'Colossus Fist Omega',
    element: 'FIRE',
    rarity: 'SSR',
    base_atk: 2800,
    base_hp: 390,
    skills: [
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% Omega Enmity — Ironflame's Enmity
      },
    ],
  },

  // ── WATER (GBF) ─────────────────────────────────────────────────────────────

  // Leviathan Gaze Omega — M1 core Omega ATK staff for Water Magna
  {
    id: 'W031',
    name: 'Leviathan Gaze Omega',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2880,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% — Oceansoul's Might
      },
    ],
  },

  // Leviathan Spear Omega — high-tier Omega Might spear, pillar of Magna Water
  {
    id: 'W032',
    name: 'Leviathan Spear Omega',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 410,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Oceansoul's Might III
      },
    ],
  },

  // Europa Spear — Primal Normal Stamina + Enmity, top-tier Water Primal staple
  {
    id: 'W033',
    name: 'Europa Spear',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 3100,
    base_hp: 380,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% at full HP — Hoarfrost's Stamina III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Murgleis — dual Normal Enmity + Stamina, classic Water Primal sword
  {
    id: 'W034',
    name: 'Murgleis',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 360,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Hoarfrost's Enmity
      },
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Varuna Staff — Majesty Normal + DA Rate, Optimus Water summon synergy
  {
    id: 'W035',
    name: 'Varuna Staff',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2800,
    base_hp: 530,
    skills: [
      {
        skill_type: 'MAJESTY_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10 effective: 14% ATK+HP — Hoarfrost's Majesty
      },
      {
        skill_type: 'DA_RATE', skill_category: null, effect_id: 'da', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Xeno Cocytus Axe — EX Voltage axe from Xeno Cocytus event, Water EX anchor
  {
    id: 'W036',
    name: 'Xeno Cocytus Axe',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% EX ATK — Tsunami's Might II (Voltage)
      },
    ],
  },

  // Blutgang — dual Normal Stamina + Enmity sabre, flexible mid-tier Primal pick
  {
    id: 'W037',
    name: 'Blutgang',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 460,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Hoarfrost's Stamina
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },

  // Leviathan Scepter Omega — Omega HP (Aegis) + Omega Might utility combo
  {
    id: 'W038',
    name: 'Leviathan Scepter Omega',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2700,
    base_hp: 580,
    skills: [
      {
        skill_type: 'HP_BOOST_OMEGA', skill_category: 'omega', effect_id: 'hp', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // SL10: 14% Omega HP — Oceansoul's Aegis
      },
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },

  // True Cocytus Blade — Xeno 5★ upgrade, EX Enmity + Charge Speed
  {
    id: 'W039',
    name: 'True Cocytus Blade',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 3150,
    base_hp: 350,
    skills: [
      {
        skill_type: 'ENMITY_EX', skill_category: 'ex', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // SL10 effective: 18.7% EX Enmity — Tsunami's Enmity
      },
      {
        skill_type: 'CHARGE_SPEED', skill_category: null, effect_id: 'prog', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Healing Zechariah — Normal Majesty gun, the standard support Water Normal filler
  {
    id: 'W040',
    name: 'Healing Zechariah',
    element: 'WATER',
    rarity: 'SSR',
    base_atk: 2650,
    base_hp: 560,
    skills: [
      {
        skill_type: 'MAJESTY_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
        // Hoarfrost's Majesty
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'small',
        skill_level: 5, magnitude_base: 0.025, magnitude_per_level: 0.005,
      },
    ],
  },

  // ── EARTH (GBF) ─────────────────────────────────────────────────────────────

  // Yggdrasil Crystal Blade Omega — flagship M1 Omega Might sword for Earth Magna
  {
    id: 'W041',
    name: 'Yggdrasil Crystal Blade Omega',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 430,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Lifetree's Might III
      },
    ],
  },

  // Yggdrasil Bow Omega — Omega Might + Omega Enmity, dual-skill Magna bow
  {
    id: 'W042',
    name: 'Yggdrasil Bow Omega',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2800,
    base_hp: 460,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Lifetree's Might II
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
        // Lifetree's Enmity
      },
    ],
  },

  // Alexiel's Spear — Primal Normal anchor, Might III + Enmity dual Normal
  {
    id: 'W043',
    name: "Alexiel's Spear",
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 390,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Terra's Might III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Caduceus — Normal Stamina + HP Boost, tanky Primal Earth staff
  {
    id: 'W044',
    name: 'Caduceus',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2750,
    base_hp: 560,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Terra's Stamina
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Terra's Aegis
      },
    ],
  },

  // Sacred Codex — Majesty Normal + HP Boost tome for Optimus Earth grids
  {
    id: 'W045',
    name: 'Sacred Codex',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2700,
    base_hp: 580,
    skills: [
      {
        skill_type: 'MAJESTY_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Terra's Majesty
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.008,
      },
    ],
  },

  // Xeno Vohu Manah Spear — Xeno Clash EX spear, core EX source for Earth grids
  {
    id: 'W046',
    name: 'Xeno Vohu Manah Spear',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 420,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% EX ATK — Gaia's Might II (Voltage)
      },
    ],
  },

  // Gae Bulg — EX Charge Speed progression lance, good EX slot filler
  {
    id: 'W047',
    name: 'Gae Bulg',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Gaia's Might (Progression)
      },
      {
        skill_type: 'CHARGE_SPEED', skill_category: null, effect_id: 'prog', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Yggdrasil Dagger Omega — Omega Stamina dagger for Magna Earth builds
  {
    id: 'W048',
    name: 'Yggdrasil Dagger Omega',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2820,
    base_hp: 470,
    skills: [
      {
        skill_type: 'STAMINA_OMEGA', skill_category: 'omega', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Lifetree's Stamina
      },
    ],
  },

  // True Vohu Manah Lance — Xeno 5★ upgrade, EX Enmity + CA DMG Cap
  {
    id: 'W049',
    name: 'True Vohu Manah Lance',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 3200,
    base_hp: 340,
    skills: [
      {
        skill_type: 'ENMITY_EX', skill_category: 'ex', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // SL10 effective: 18.7% — Gaia's Enmity
      },
      {
        skill_type: 'DMG_CAP_CA', skill_category: null, effect_id: 'cap', tier: 'medium',
        skill_level: 8, magnitude_base: 0.06, magnitude_per_level: 0.01,
      },
    ],
  },

  // Fallen Sword (Earth) — Normal Enmity sword, budget Primal filler
  {
    id: 'W050',
    name: 'Fallen Sword (Earth)',
    element: 'EARTH',
    rarity: 'SSR',
    base_atk: 2780,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Terra's Enmity
      },
    ],
  },

  // ── WIND (GBF) ──────────────────────────────────────────────────────────────

  // Tiamat Bolt Omega — dual Omega Might + Omega Enmity, best M1 weapon in game
  {
    id: 'W051',
    name: 'Tiamat Bolt Omega',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Stormwyrm's Might II
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Stormwyrm's Enmity — rare dual-Omega skill in a single weapon slot
      },
    ],
  },

  // Tiamat Amood Omega — same dual Omega skill set as Bolt on an axe frame
  {
    id: 'W052',
    name: 'Tiamat Amood Omega',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Stormwyrm's Might II
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Tiamat Gauntlet Omega — Omega Stamina + Omega Crit (Verity) for Magna Wind
  {
    id: 'W053',
    name: 'Tiamat Gauntlet Omega',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2870,
    base_hp: 460,
    skills: [
      {
        skill_type: 'STAMINA_OMEGA', skill_category: 'omega', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Stormwyrm's Stamina II
      },
      {
        skill_type: 'CRITICAL_RATE', skill_category: null, effect_id: 'critical', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.01,
        // Stormwyrm's Verity III
      },
    ],
  },

  // Grimnir's Spear — Primal Normal anchor with Might + Enmity for Wind
  {
    id: 'W054',
    name: "Grimnir's Spear",
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 390,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Ventosus's Might III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Auberon — Normal Enmity sword with Restraint (DA+Crit) for hybrid Wind builds
  {
    id: 'W055',
    name: 'Auberon',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 380,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Ventosus's Enmity
      },
      {
        skill_type: 'RESTRAINT', skill_category: null, effect_id: 'restraint', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Xeno Sagittarius Bow — primary EX Voltage source for Wind from Xeno Clash
  {
    id: 'W056',
    name: 'Xeno Sagittarius Bow',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 430,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // SL10 effective: 16.8% — Gale's Might II (Voltage)
      },
    ],
  },

  // Nibelung Horn — dual Omega ATK + Omega TA Rate for multiattack Wind grids
  {
    id: 'W057',
    name: 'Nibelung Horn',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2820,
    base_hp: 480,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Stormwyrm's Majesty (ATK component)
      },
      {
        skill_type: 'TA_RATE', skill_category: null, effect_id: 'ta', tier: 'big',
        skill_level: 10, magnitude_base: 0.04, magnitude_per_level: 0.007,
        // Stormwyrm's Restraint (TA component)
      },
    ],
  },

  // Last Storm Harp — Omega Tyranny harp, massive ATK boost at HP cost
  {
    id: 'W058',
    name: 'Last Storm Harp',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 3100,
    base_hp: 320,
    skills: [
      {
        skill_type: 'TYRANNY', skill_category: null, effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.08, magnitude_per_level: 0.014,
        // Stormwyrm's Tyranny — big ATK at HP reduction cost
      },
    ],
  },

  // Chop Chop — EX ATK knife, budget EX filler for Wind before Xeno
  {
    id: 'W059',
    name: 'Chop Chop',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 2750,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Gale's Might (Voltage)
      },
    ],
  },

  // True Sagittarius Bow — Xeno 5★ upgrade, EX Stamina + DMG Cap combo
  {
    id: 'W060',
    name: 'True Sagittarius Bow',
    element: 'WIND',
    rarity: 'SSR',
    base_atk: 3200,
    base_hp: 340,
    skills: [
      {
        skill_type: 'STAMINA_EX', skill_category: 'ex', effect_id: 'stamina', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // Gale's Stamina
      },
      {
        skill_type: 'DMG_CAP_NA', skill_category: null, effect_id: 'cap', tier: 'medium',
        skill_level: 8, magnitude_base: 0.05, magnitude_per_level: 0.009,
      },
    ],
  },

  // ── LIGHT (GBF) ─────────────────────────────────────────────────────────────

  // Luminiera Sword Omega — core M1 Omega Might sword for Light Magna
  {
    id: 'W061',
    name: 'Luminiera Sword Omega',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Knightcode's Might II
      },
    ],
  },

  // Luminiera Bhuj Omega — massive-tier Omega Might axe for Light Magna
  {
    id: 'W062',
    name: 'Luminiera Bhuj Omega',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Knightcode's Might III
      },
    ],
  },

  // Luminiera Bolt Omega — Omega Might bolt (caster frame), standard Magna filler
  {
    id: 'W063',
    name: 'Luminiera Bolt Omega',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2750,
    base_hp: 490,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Knightcode's Might II
      },
    ],
  },

  // Metatron's Staff — Primal Normal Might + Enmity staff for Light Optimus
  {
    id: 'W064',
    name: "Metatron's Staff",
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 420,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Celestia's Might III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Gabriel's Guard — Normal Stamina + HP Boost shield weapon, tanky support
  {
    id: 'W065',
    name: "Gabriel's Guard",
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2650,
    base_hp: 620,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Celestia's Stamina
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Celestia's Aegis
      },
    ],
  },

  // Xeno Pyet-A Staff — Xeno Clash EX staff, core EX Voltage source for Light
  {
    id: 'W066',
    name: 'Xeno Pyet-A Staff',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 460,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Glory's Might II (Voltage)
      },
    ],
  },

  // Cosmic Sword (Light) — EX Might sword, reliable EX slot for Light grids
  {
    id: 'W067',
    name: 'Cosmic Sword (Light)',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2850,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Glory's Might
      },
    ],
  },

  // True Judgement Lyre — Xeno 5★ upgrade, EX Enmity + Trium
  {
    id: 'W068',
    name: 'True Judgement Lyre',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 3150,
    base_hp: 350,
    skills: [
      {
        skill_type: 'ENMITY_EX', skill_category: 'ex', effect_id: 'enmity', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // Glory's Enmity
      },
      {
        skill_type: 'TRIUM', skill_category: null, effect_id: 'trium', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },

  // Anchira Cane — Normal Majesty + HP Boost, flexible Light support Normal pick
  {
    id: 'W069',
    name: 'Anchira Cane',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2720,
    base_hp: 540,
    skills: [
      {
        skill_type: 'MAJESTY_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Celestia's Majesty
      },
      {
        skill_type: 'HP_BOOST', skill_category: 'normal', effect_id: 'hp', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.008,
      },
    ],
  },

  // Luminiera Harp Omega — Omega HP (Aegis) + Omega Might utility for Magna
  {
    id: 'W070',
    name: 'Luminiera Harp Omega',
    element: 'LIGHT',
    rarity: 'SSR',
    base_atk: 2680,
    base_hp: 570,
    skills: [
      {
        skill_type: 'HP_BOOST_OMEGA', skill_category: 'omega', effect_id: 'hp', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Knightcode's Aegis
      },
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },

  // ── DARK (GBF) ──────────────────────────────────────────────────────────────

  // Celeste Claw Omega — iconic dual Omega Might + Omega Enmity, best M1 for Dark
  {
    id: 'W071',
    name: 'Celeste Claw Omega',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Mistfall's Might II
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Mistfall's Enmity — dual Omega, same prestige as Tiamat Bolt for Wind
      },
    ],
  },

  // Celeste Zaghnal Omega — same dual Omega skill set on a scythe frame
  {
    id: 'W072',
    name: 'Celeste Zaghnal Omega',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3050,
    base_hp: 380,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Celeste Horn Omega — massive-tier single Omega Might horn, ATK-focused Magna
  {
    id: 'W073',
    name: 'Celeste Horn Omega',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2900,
    base_hp: 440,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Mistfall's Might III
      },
    ],
  },

  // Avatar's Staff — Primal Normal anchor, Might + Enmity dual Normal for Dark
  {
    id: 'W074',
    name: "Avatar's Staff",
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 420,
    skills: [
      {
        skill_type: 'ATK_NORMAL', skill_category: 'normal', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Hatred's Might III
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Fallen Sword (Dark) — dual Normal Enmity + Stamina, flexible Primal Dark sword
  {
    id: 'W075',
    name: 'Fallen Sword (Dark)',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2950,
    base_hp: 420,
    skills: [
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Hatred's Enmity
      },
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
      },
    ],
  },

  // Xeno Diablo Axe — Xeno Clash EX axe, primary EX Voltage source for Dark
  {
    id: 'W076',
    name: 'Xeno Diablo Axe',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3000,
    base_hp: 400,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'massive',
        skill_level: 10, magnitude_base: 0.06, magnitude_per_level: 0.012,
        // Oblivion's Might II (Voltage)
      },
    ],
  },

  // Mirror-Blade Shard — Normal Stamina + Normal Enmity, crafted Primal filler
  {
    id: 'W077',
    name: 'Mirror-Blade Shard',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2870,
    base_hp: 450,
    skills: [
      {
        skill_type: 'STAMINA_NORMAL', skill_category: 'normal', effect_id: 'stamina', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Hatred's Stamina
      },
      {
        skill_type: 'ENMITY_NORMAL', skill_category: 'normal', effect_id: 'enmity', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.009,
      },
    ],
  },

  // Stygian Claw — Omega Might + Omega Enmity gacha claw, Dark Magna upgrade piece
  {
    id: 'W078',
    name: 'Stygian Claw',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3100,
    base_hp: 370,
    skills: [
      {
        skill_type: 'ATK_OMEGA', skill_category: 'omega', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Mistfall's Might II
      },
      {
        skill_type: 'ENMITY_OMEGA', skill_category: 'omega', effect_id: 'enmity', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Mistfall's Enmity II
      },
    ],
  },

  // Cosmic Sword (Dark) — EX Might sword, budget EX slot before Xeno
  {
    id: 'W079',
    name: 'Cosmic Sword (Dark)',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 2850,
    base_hp: 450,
    skills: [
      {
        skill_type: 'ATK_EX', skill_category: 'ex', effect_id: 'might', tier: 'big',
        skill_level: 10, magnitude_base: 0.05, magnitude_per_level: 0.01,
        // Oblivion's Might
      },
    ],
  },

  // True Diablo Blade — Xeno 5★ upgrade, EX Stamina + Charge Speed
  {
    id: 'W080',
    name: 'True Diablo Blade',
    element: 'DARK',
    rarity: 'SSR',
    base_atk: 3200,
    base_hp: 340,
    skills: [
      {
        skill_type: 'STAMINA_EX', skill_category: 'ex', effect_id: 'stamina', tier: 'massive',
        skill_level: 10, magnitude_base: 0.07, magnitude_per_level: 0.013,
        // Oblivion's Stamina
      },
      {
        skill_type: 'CHARGE_SPEED', skill_category: null, effect_id: 'prog', tier: 'medium',
        skill_level: 8, magnitude_base: 0.04, magnitude_per_level: 0.007,
      },
    ],
  },
];