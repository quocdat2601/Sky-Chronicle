// ─────────────────────────────────────────────────────────────────────────────
// BOSSES — Boss instance data
//
// Each entry defines one raid boss: stats, phases, triggers.
// For future scale: move to a database table. Shape stays identical.
// ─────────────────────────────────────────────────────────────────────────────

export const BOSSES = [
  {
    id: 'BOSS001',
    name: 'Ignarok the Ashen Drake',
    element: 'FIRE',
    hp_max: 600000000,
    def: 25,
    base_atk: 3200,
    charge_gain_per_turn: 18,
    phases: [
      {
        phase: 1,
        hp_threshold: 1.0,
        normal_attack: { hits: 1, dmg_multiplier: 1.0, effect: null },
        charge_attack: {
          name: 'Scorched Earth',
          dmg_multiplier: 3.5,
          effect: { type: 'BURN', damage: 300, target: 'ALL_ALLIES', duration: 2 },
        },
      },
      {
        phase: 2,
        hp_threshold: 0.5,
        normal_attack: { hits: 2, dmg_multiplier: 0.7, effect: { type: 'ATK_DOWN', amount: -0.10, duration: 2 } },
        charge_attack: {
          name: 'Cataclysm',
          dmg_multiplier: 5.0,
          effect: { type: 'BURN', damage: 500, target: 'ALL_ALLIES', duration: 3 },
        },
        on_enter: { type: 'BUFF', effect: 'CLEAR_DEBUFFS', description: 'Boss shakes off all debuffs entering phase 2!' },
      },
    ],
    triggers: [
      {
        hp_pct: 0.75,
        name: 'Flame Roar',
        action: { type: 'DEBUFF', target: 'ALL_ALLIES', stat: 'ATK', amount: -0.20, duration: 2 },
        description: 'At 75% HP, boss roars and reduces all allies ATK by 20%.',
        fired: false,
      },
      {
        hp_pct: 0.25,
        name: 'Death Throes',
        action: { type: 'BUFF_SELF', stat: 'ATK', amount: 0.50, duration: 5 },
        description: 'At 25% HP, boss enters a berserk state with +50% ATK.',
        fired: false,
      },
    ],
  },
  {
    id: 'BOSS002',
    name: 'Leviathon, Deep Terror',
    element: 'WATER',
    hp_max: 600000,
    def: 600,
    base_atk: 2800,
    charge_gain_per_turn: 22,
    phases: [
      {
        phase: 1,
        hp_threshold: 1.0,
        normal_attack: { hits: 1, dmg_multiplier: 1.0, effect: null },
        charge_attack: {
          name: 'Tidal Crush',
          dmg_multiplier: 3.0,
          effect: { type: 'DELAY', charge_reduce: 30, target: 'ALL_ALLIES' },
        },
      },
      {
        phase: 2,
        hp_threshold: 0.45,
        normal_attack: { hits: 1, dmg_multiplier: 1.2, effect: { type: 'BLIND', hit_reduction: 0.30, duration: 2 } },
        charge_attack: {
          name: 'Abyssal Maelstrom',
          dmg_multiplier: 4.5,
          effect: { type: 'DELAY', charge_reduce: 50, target: 'ALL_ALLIES' },
        },
        on_enter: { type: 'BUFF', effect: 'ATK_UP', amount: 0.30, duration: 999, description: 'Leviathon surges with power!' },
      },
    ],
    triggers: [
      {
        hp_pct: 0.60,
        name: 'Dark Depths',
        action: { type: 'FIELD', effect: 'WATER_INFUSE', description: 'Field becomes water-infused; Water DMG +15%.' },
        fired: false,
      },
    ],
  },
  {
    id: 'BOSS003',
    name: 'Lucilius',
    element: 'NULL',
    hp_max: 500000000,
    def: 50,
    base_atk: 4500,
    charge_gain_per_turn: 15,

    sub_entities: [
      {
        id: 'BOSS003_WINGS',
        name: 'Black Wings',
        element: 'DARK',
        hp_max: 80000000,
        def: 30,
        base_atk: 2500,
        charge_gain_per_turn: 20,
        phases: [
          {
            phase: 1,
            hp_threshold: 1.0,
            normal_attack: { hits: 1, dmg_multiplier: 1.0, target: 'ALL_ALLIES', element: 'DARK', effect: null },
            charge_attack: { name: 'Black Flare', dmg_multiplier: 3.0, target: 'ALL_ALLIES', element: 'DARK', effect: null },
          },
        ],
        triggers: [
          {
            hp_pct: 0.35,
            name: 'Seven Trumpets',
            action: {
              type: 'SELF_BUFF',
              effect: 'CHANGE_NORMAL_ATTACK',
              new_attack: { hits: 3, dmg_multiplier: 0.5, target: 'ALL_ALLIES', element: 'RANDOM' },
            },
            description: 'Black Wings changes its normal attack to multi-hit random element damage to all allies.',
            fired: false,
          },
        ],
        on_death: {
          type: 'REMOVE_BOSS_BUFF',
          target: 'BOSS003',
          buff_name: 'Wings of the Word',
          description: 'Slaying Black Wings removes Wings of the Word from Lucilius.',
        },
      },
    ],

    passive_stacks: {
      name: "Evangelist's Blade",
      current: 0,
      max: 10,
      per_special: 1,
      per_dispel_taken: -1,
      effects_per_level: [
        { level: 1, atk_bonus: 0.10 },
        { level: 2, atk_bonus: 0.20 },
        { level: 3, atk_bonus: 0.30, def_bonus: 0.10 },
        { level: 5, atk_bonus: 0.40, def_bonus: 0.20, charge_gain_per_turn_bonus: 3 },
        { level: 8, atk_bonus: 0.50, def_bonus: 0.30, debuff_resist: 0.50 },
        { level: 10, atk_bonus: 0.60, def_bonus: 0.40, debuff_resist: 0.80 },
      ],
    },

    conditional_buffs: [
      {
        id: 'LABOR_FIRE',
        name: 'First Labor',
        description: 'Fire ATK boosted — clear by dealing 10M+ Fire DMG in 1 turn',
        effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'FIRE', bonus_dmg: 0.30 },
        clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'FIRE', threshold: 10000000 },
        active: false,
      },
      {
        id: 'LABOR_WATER',
        name: 'Second Labor',
        description: 'Water ATK boosted — clear by dealing 10M+ Water DMG in 1 turn',
        effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WATER', bonus_dmg: 0.30 },
        clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WATER', threshold: 10000000 },
        active: false,
      },
      {
        id: 'LABOR_WIND',
        name: 'Third Labor',
        description: 'Wind ATK boosted — clear by dealing 10M+ Wind DMG in 1 turn',
        effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WIND', bonus_dmg: 0.30 },
        clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WIND', threshold: 10000000 },
        active: false,
      },
      {
        id: 'LABOR_CHAIN',
        name: 'Chain Labor',
        description: 'Nullifies all elemental DMG cut — clear by activating a 5+ chain burst',
        effect: { type: 'NULLIFY_ELEM_CUT' },
        clear_condition: { type: 'CHAIN_BURST', minimum_chains: 5 },
        active: false,
      },
      {
        id: 'LABOR_STRIP',
        name: 'Stripping Labor',
        description: 'Removes 2 buffs from all allies each turn — clear by triggering Paradise Lost CA',
        effect: { type: 'TURN_START_DEBUFF', action: 'REMOVE_BUFF', count: 2, target: 'ALL_ALLIES' },
        clear_condition: { type: 'SPECIFIC_CA', ca_name: 'Paradise Lost' },
        active: false,
      },
      {
        id: 'LABOR_FINAL',
        name: 'Twelfth Labor',
        description: 'Deals 15,000 plain DMG to a random ally per turn — clear by clearing ALL other Labors',
        effect: { type: 'TURN_START_DAMAGE', damage: 15000, target: 'RANDOM_ALLY', is_plain: true },
        clear_condition: { type: 'ALL_OTHER_LABORS_CLEARED' },
        active: false,
      },
    ],

    countdown: {
      name: 'Grand Finale',
      current: 6,
      decrement_on: 'ALLY_KO',
      on_zero: {
        type: 'RAID_WIPE',
        name: 'The End',
        message: 'The Grand Finale countdown reached zero. All parties are annihilated.',
      },
    },

    field_on_join: [
      {
        type: 'DEBUFF_PLAYER',
        effect: 'SUMMONLESS',
        target: 'ALL_PLAYERS',
        duration: 999,
        description: 'Summons cannot be used.',
      },
    ],

    damage_cap: {
      name: 'Wings of the Word',
      active: true,
      per_turn_cap: 300000,
      remove_condition: 'ATTACKED_WHILE_BROKEN',
      description: 'Damage Lucilius takes per player per turn is capped at 300,000 while Wings of the Word is active.',
    },

    phases: [
      {
        phase: 1,
        hp_threshold: 1.0,
        label: 'Descent',
        normal_attack: {
          hits: 3,
          dmg_multiplier: 0.8,
          target: 'ALL_ALLIES',
          element: 'RANDOM',
          effect: null,
          note: 'Post-Paradise-Lost: random element multi-hit to all allies.',
        },
        charge_attack: {
          name: 'Paradise Lost',
          dmg_multiplier: 0,
          plain_damage: 30000,
          target: 'ALL_ALLIES',
          is_plain: true,
          effect: [
            { type: 'FIELD_DEBUFF', effect: 'SUMMONLESS', target: 'ALL_PLAYERS', duration: 999 },
            { type: 'BOSS_BUFF', buff: 'Wings of the Word', duration: 999 },
            { type: 'NORMAL_ATTACK_CHANGE', new_hits: 3, target: 'ALL_ALLIES', element: 'RANDOM' },
          ],
        },
      },
      {
        phase: 2,
        hp_threshold: 0.35,
        label: 'The Twelve Labors',
        on_enter: {
          type: 'MULTI',
          actions: [
            {
              type: 'CA_FIRE',
              name: 'Paradise Lost (Elemental)',
              plain_damage: 0,
              random_elem_damage: 120000,
              target: 'ALL_ALLIES',
              ignores_elem_cut: true,
              effect: { type: 'DEBUFF', effect: 'DEATH_INELUCTABLE', on: 'KO_FROM_THIS_ATTACK' },
            },
            {
              type: 'ACTIVATE_CONDITIONAL_BUFFS',
              buff_ids: ['LABOR_FIRE','LABOR_WATER','LABOR_WIND','LABOR_CHAIN','LABOR_STRIP','LABOR_FINAL'],
              description: 'Lucilius gains the Twelve Labors.',
            },
          ],
        },
        normal_attack: {
          hits: 3,
          dmg_multiplier: 0.9,
          target: 'ALL_ALLIES',
          element: 'RANDOM',
          effect: null,
        },
        charge_attack: {
          name: 'Paradise Lost (Elemental)',
          random_elem_damage: 120000,
          ignores_elem_cut: true,
          target: 'ALL_ALLIES',
          effect: { type: 'DEBUFF', effect: 'DEATH_INELUCTABLE', on: 'KO_FROM_THIS_ATTACK' },
        },
      },
    ],

    triggers: [
      {
        hp_pct: 0.95,
        name: 'Phosphorus',
        action: {
          type: 'ATTACK_SINGLE',
          target: 'HIGHEST_ATK_ALLY',
          random_elem_damage: 210000,
          effect: { type: 'REMOVE_ALL_BUFFS', target: 'SAME_TARGET' },
        },
        description: '~210k random element damage to the highest-ATK ally; removes all their buffs.',
        fired: false,
      },
      {
        hp_pct: 0.85,
        name: 'Axion',
        action: {
          type: 'ATTACK_ALL',
          random_elem_damage: 80000,
          on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30000, target: 'ALL_ALLIES' },
        },
        description: 'Random element damage to all allies. If any ally is KO\'d, deals extra 30k plain dmg to all.',
        fired: false,
      },
      {
        hp_pct: 0.75,
        name: 'Atheism',
        action: {
          type: 'MULTI',
          actions: [
            { type: 'BOSS_BUFF', buff: 'Renunciation', duration: 999, description: 'Debuff resistant to all elements except one random element.' },
            { type: 'CLEAR_DEBUFFS_ON_SELF' },
          ],
          remove_if: { type: 'DEBUFF_COUNT_ON_SELF', count: 6, check: 'TURN_END' },
        },
        description: 'Lucilius gains Renunciation (debuff resistance vs non-chosen element). Clears his debuffs. Removed at turn-end if he has ≥6 debuffs.',
        fired: false,
      },
      {
        hp_pct: 0.70,
        name: 'Wrath of Heaven',
        action: { type: 'FILL_CHARGE_BAR', target: 'SELF' },
        description: 'Lucilius immediately fills his charge bar to maximum.',
        fired: false,
      },
      {
        hp_pct: 0.60,
        name: 'Axion (2nd)',
        action: {
          type: 'ATTACK_ALL',
          random_elem_damage: 80000,
          on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30000, target: 'ALL_ALLIES' },
        },
        description: 'Second Axion trigger — same as 85% version.',
        fired: false,
      },
      {
        hp_pct: 0.55,
        name: 'Iblis',
        action: {
          type: 'ATTACK_RANDOM',
          hits: 5,
          random_elem_damage: 50000,
          effect: [
            { type: 'DEBUFF', stat: 'PETRIFIED', duration: 1 },
            { type: 'DEBUFF', stat: 'WEAKENED', amount: -0.25, duration: 2 },
            { type: 'DEBUFF', stat: 'SLASHED', amount: -0.25, duration: 2 },
          ],
        },
        description: 'Multi-hit random element damage to random allies. Inflicts Petrified, Weakened, and Slashed.',
        fired: false,
      },
      {
        hp_pct: 0.25,
        name: 'Gopherwood Ark',
        action: {
          type: 'KO_DUPLICATE_RACE',
          description: 'KOs all allies that share a race with any other ally in the party. First ally of each race is spared.',
        },
        description: 'Lucilius judges the party. Duplicate race members are KO\'d.',
        fired: false,
      },
      {
        hp_pct: 0.10,
        name: 'Paradise Lost (Apocalypse)',
        action: {
          type: 'MULTI',
          actions: [
            { type: 'FILL_CHARGE_BAR', target: 'SELF' },
            { type: 'ATTACK_ALL', plain_damage: 999999 },
          ],
        },
        description: 'Fills charge bar, then deals 999,999 random element damage to all allies.',
        fired: false,
      },
      {
        hp_pct: 0.03,
        name: 'Paradise Lost (Final)',
        action: {
          type: 'MULTI',
          actions: [
            { type: 'FILL_CHARGE_BAR', target: 'SELF' },
            { type: 'ATTACK_ALL', plain_damage: 999999 },
          ],
        },
        description: 'Second apocalypse trigger at 3% HP.',
        fired: false,
      },
    ],
  },
];
