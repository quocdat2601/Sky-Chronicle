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
    hp_max: 800000,
    def: 800,
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
];