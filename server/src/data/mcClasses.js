// ─────────────────────────────────────────────────────────────────────────────
// MC CLASS DATA — Row V (Tier 5) + starter classes for Sky Chronicle
//
// Each class has:
//   id, name, row, role, weapon_prof[], base_hp, base_atk,
//   preset_skill: { name, cd, description, effect_type }
//   skills[]: subskills & support skills
//   charge_attack: placeholder (will connect to grid CA system later)
//   flavor: short tagline
//   unlock_note: how to unlock
// ─────────────────────────────────────────────────────────────────────────────

export const MC_CLASSES = [

  // ── ROW I (starter) ─────────────────────────────────────────────────────────
  {
    id: 'MC_FIGHTER', name: 'Fighter', row: 1, role: 'ATTACK',
    weapon_prof: ['SWORD', 'SABRE'],
    base_hp: 1820, base_atk: 6200,
    flavor: 'A straightforward warrior. Slashes, defends, repeats.',
    unlock_note: 'Default — available from start',
    preset_skill: {
      name: 'Shining Slash',
      cd: 7, effect_type: 'DAMAGE',
      description: 'Deal 250% elemental DMG to one foe.',
    },
    skills: [
      { name: 'Charge Attack Up', cd: 8, effect_type: 'BUFF', description: 'Boost own CA DMG 30% for 3 turns.' },
      { name: 'Double Strike', cd: 10, effect_type: 'BUFF', description: 'MC attacks twice this turn.' },
    ],
    charge_attack: { name: 'Raging Strike', description: 'Massive elemental DMG to one foe. [CA system — v2.0]' },
  },

  // ── ROW V ─────────────────────────────────────────────────────────────────
  {
    id: 'MC_V_LUMBERJACK', name: 'Lumberjack', row: 5, role: 'BALANCE',
    weapon_prof: ['AXE', 'SPEAR'],
    base_hp: 3300, base_atk: 9150,
    flavor: 'Calls upon forest allies. The more you act, the more they respond.',
    unlock_note: 'Weapon Master (ML30) + any Rusted Row IV (ML30) + 10,000 CP',
    preset_skill: {
      name: "Woodcutter's Song",
      cd: 7, effect_type: 'BUFF',
      description: "Gain reactive buff (3 turns, can't remove). Triggers on: every 3 skills used → Forest Friends deal ~80K skill DMG + heal 1500 HP all. On CA → Forest Friends + ATK Up 20% all. On taking DMG → Forest Friends + Shield 1500 all. On enemy special → Forest Friends + clear all debuffs.",
    },
    skills: [
      { name: 'Tactical Retreat',  cd: 8,  effect_type: 'HEAL',   description: 'Restore all allies HP (cap ~3500). Gain Uplift 10% + Armored 20% for 3 turns.' },
      { name: 'Leaf Burning',      cd: 10, effect_type: 'BUFF',   description: 'All allies: ATK Up 30% (stackable, max 90%) + DEF Up 20% (stackable, max 60%) + Uplift 10%. Endurance buff — lasts until charge bar empties.' },
      { name: 'Woodland Warrior',  cd: 9,  effect_type: 'DAMAGE', description: '350% elem DMG to all foes. Inflict ATK Down 25% (dual-stack) + DEF Down 25% (dual-stack).' },
    ],
    charge_attack: { name: "Forester's Reckoning", description: 'Massive elemental DMG to all foes + Forest Friends trigger immediately. [CA system — v2.0]' },
  },
  {
    id: 'MC_V_SPARTAN', name: 'Spartan', row: 5, role: 'DEF',
    weapon_prof: ['SWORD', 'SPEAR'],
    base_hp: 4200, base_atk: 7800,
    flavor: 'An unbreakable shield wall. At death\'s door, becomes unstoppable.',
    unlock_note: 'Sentinel (ML30) + Valkyrie (ML30) + 10,000 CP',
    preset_skill: {
      name: 'Phalanx II',
      cd: 12, effect_type: 'BUFF',
      description: "All allies gain 70% DMG Cut (1 turn) + Shield 3000 HP. Special: When MC HP is below 25%, this skill has NO cooldown — it resets to 0 immediately after use.",
    },
    skills: [
      { name: 'Provoke',       cd: 8,  effect_type: 'BUFF',   description: 'MC substitutes for all allies (2 turns) — all attacks hit MC. Gain ATK Up 30% + DEF Up 40%.' },
      { name: 'Blood and Iron', cd: 7,  effect_type: 'BUFF',  description: 'Gain enmity ATK Up (scales with missing HP, max ~50%) + Charge Bar +30%.' },
      { name: 'Iron Will',     cd: 12, effect_type: 'BUFF',   description: 'Survive next lethal hit with 1 HP (endure, 1 time). Gain Regen 1500 HP/turn for 3 turns.' },
    ],
    charge_attack: { name: 'Leonidas Bane', description: 'Massive elemental DMG to one foe + all allies gain 20% DMG Cut for 2 turns. [CA system — v2.0]' },
  },
  {
    id: 'MC_V_WARLOCK', name: 'Warlock', row: 5, role: 'SPECIAL',
    weapon_prof: ['STAFF', 'SWORD'],
    base_hp: 2800, base_atk: 10200,
    flavor: 'Masters of the Arcane Field. Patience yields overwhelming power.',
    unlock_note: 'Sorcerer (ML30) + Sage (ML30) + 10,000 CP',
    preset_skill: {
      name: 'Arcane Torrent',
      cd: 0, effect_type: 'BUFF',
      description: 'FREE 0-turn action: Raise Arcane Field level by 1 (max Lv7). Each turn, the Field grants all allies ATK/DEF/DA/Crit/debuff resist (scales with level). End of each turn: deal (100% × level) hits of elemental DMG (cap ~100K/hit) to all foes. Consumes 10% charge bar/turn.',
    },
    skills: [
      { name: 'Aether Blast III',   cd: 10, effect_type: 'DAMAGE', description: '400%-500% elem DMG to all foes (cap ~450K, scales with Arcane Field level).' },
      { name: 'Dimensional Blade',  cd: 8,  effect_type: 'DAMAGE', description: '500% elem DMG to one foe + DEF Down 25% (dual-stack, 3 turns).' },
      { name: 'Mystic Veil',        cd: 10, effect_type: 'BUFF',   description: 'All allies gain Veil (nullify next debuff) + restore HP (cap ~2000) + Charge Bar +20%.' },
    ],
    charge_attack: { name: 'Arcane Nova', description: 'Massive elemental DMG to all foes + raise Arcane Field level by 2. [CA system — v2.0]' },
  },
  {
    id: 'MC_V_SOLDIER', name: 'Soldier', row: 5, role: 'ATK',
    weapon_prof: ['GUN', 'SWORD'],
    base_hp: 3100, base_atk: 9500,
    flavor: 'Six bullets, infinite tactics. Never runs dry.',
    unlock_note: 'Sidewinder (ML30) + Hawkeye (ML30) + 10,000 CP',
    preset_skill: {
      name: "Lock 'n' Load",
      cd: 0, effect_type: 'BUFF',
      description: "FREE 0-turn action: Discard all remaining bullets and reload 6 new bullets from your configured loadout. Each bullet adds elemental or status effects to normal attacks. Passive — Immortal Operative: When HP drops below 25%, gain Double Strike (attack twice) for 2 turns.",
    },
    skills: [
      { name: 'Fire at Will', cd: 8,  effect_type: 'DAMAGE', description: 'Deal 100% elem DMG 6 times to random foes. Apply random status debuff on each hit. Assassin buffs consumed on first volley.' },
      { name: 'Assassin',     cd: 7,  effect_type: 'BUFF',   description: 'Gain Assassin: ATK Up 100% + Guaranteed TA on next attack. Effect is consumed on first attack (or bullet volley).' },
      { name: 'Tactical Shield', cd: 10, effect_type: 'BUFF', description: 'All allies gain Shield 2000 + Veil (1 time) + 20% Armored (3 turns).' },
    ],
    charge_attack: { name: 'Alpha Salvo', description: 'Massive elemental DMG to one foe + Delay (remove 1 charge diamond) + refresh Lock \'n\' Load. [CA system — v2.0]' },
  },
  {
    id: 'MC_V_VIKING', name: 'Viking', row: 5, role: 'ATK',
    weapon_prof: ['SWORD', 'AXE'],
    base_hp: 3000, base_atk: 9800,
    flavor: 'Dual-weapon berserker. Sabre + Axe unlocks true potential.',
    unlock_note: 'Berserker (ML30) + Ogre (ML30) + 10,000 CP',
    preset_skill: {
      name: 'Mjolnir Mash',
      cd: 7, effect_type: 'BUFF',
      description: 'All allies: Elemental ATK Up 20% + DA Up 20% + TA Up 10% for 3 turns. BONUS when Sabre AND Axe are both equipped (main + aux slots): additionally grant Shield 2000 + Skill DMG Cap Up 10% + party CA DMG Up 30% (1 time) + CA DMG Cap Up 10% (1 time).',
    },
    skills: [
      { name: 'Sea Breaker',      cd: 8, effect_type: 'DAMAGE', description: '200%-250% elem DMG to all foes. Gain ATK Up 20% (perpetuity, stackable) + inflict DEF Down 10% (stackable, max 40%) on all foes.' },
      { name: 'Dual Axe Mastery', cd: 9, effect_type: 'BUFF',   description: 'If Sabre+Axe equipped: all allies ATK Up 20% + DMG Cap Up 10% (1 time). Otherwise: self ATK Up 30% only.' },
      { name: 'Northern Cross',   cd: 9, effect_type: 'DAMAGE', description: '350% elem DMG to all foes + all allies Charge Bar +20% + inflict ATK Down 20% (dual-stack).' },
    ],
    charge_attack: { name: 'Longship Vanguard', description: 'Massive elemental DMG to all foes + all allies gain Guaranteed TA on CA this turn. [CA system — v2.0]' },
  },
  {
    id: 'MC_V_PALADIN', name: 'Paladin', row: 5, role: 'DEF',
    weapon_prof: ['SWORD', 'SHIELD'],
    base_hp: 4000, base_atk: 7900,
    flavor: 'Sacred Order makes any hit harmless. The ultimate shield.',
    unlock_note: 'Sentinel (ML30) + Holy Saber (ML30) + 10,000 CP',
    preset_skill: {
      name: 'Sacred Order',
      cd: 10, effect_type: 'BUFF',
      description: 'All allies gain 10,000 per-hit DMG cap for 1 turn + Shield 1500. The 10,000 cap applies to ALL damage types (plain damage bypasses it). Any hit that would deal 9,999,999 DMG is reduced to exactly 10,000.',
    },
    skills: [
      { name: 'Holy Smite',     cd: 8,  effect_type: 'DAMAGE', description: '200%-250% Light elem DMG to one foe + Blind (3 turns, reduces enemy accuracy) + DEF Down 20% (dual-stack, 3 turns).' },
      { name: 'Divine Aegis',   cd: 9,  effect_type: 'BUFF',   description: 'All allies 70% Armored (3 turns) + Regen 2000 HP/turn (3 turns). MC gains Substitute effect (all attacks redirect to MC).' },
      { name: 'Judgment Sword', cd: 11, effect_type: 'DAMAGE', description: '500% Light elem DMG to one foe. Bypasses all enemy DMG-reduction buffs. Removes all buffs from target.' },
    ],
    charge_attack: { name: 'Divine Reckoning', description: 'Massive Light DMG to all foes + all allies gain Sacred Order effect for 1 additional turn. [CA system — v2.0]' },
  },
];

// Quick lookup map
export const MC_CLASS_MAP = Object.fromEntries(MC_CLASSES.map(c => [c.id, c]));

// Default class
export const MC_DEFAULT_CLASS_ID = 'MC_FIGHTER';
