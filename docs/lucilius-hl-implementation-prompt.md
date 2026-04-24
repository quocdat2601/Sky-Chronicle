# Lucilius (Impossible) — Sky-Chronicle Implementation

## PART 1: MECHANIC ANALYSIS

### Overview
Lucilius Impossible (HL) is a **dual-entity raid** — players fight TWO simultaneous targets:

| Entity | Element | HP | Notes |
|---|---|---|---|
| **Lucilius** (body) | NULL | 500,000,000 | Primary kill target |
| **Black Wings** | DARK | ~80,000,000 | Secondary target; death unlocks body endgame |

The fight has **three macro-phases** driven by body HP, with Black Wings acting as a side condition that changes Lucilius's behavior.

---

### Phase Breakdown

#### Phase 0 — JOIN (Instant trigger on battle start)
**Paradise Lost (Join Trigger)**
- Deals **30,000 plain damage** to all allies
- Inflicts **Summonless** on all players (cannot use summons for duration)
- Lucilius gains **Wings of the Word** buff (caps per-turn damage taken)
- Lucilius's normal attacks change from single-hit → **multi-hit random element to ALL allies**

---

#### Phase 1 — 100% → 36% HP (Pre-Labor)
Key triggers during this window:

| HP% | Name | Effect |
|---|---|---|
| 95%–91% | **Phosphorus** | ~210k random element dmg to ONE ally + removes all their buffs |
| 85%–76% | **Axion** | Random element dmg to ALL allies; if any ally KO'd → extra 30k plain dmg all |
| 75% | **Atheism** | Lucilius gains **Renunciation** + **Repudiation** (resist debuffs from most elements; only debuffable by specific element). Can be removed if he has ≥6 debuffs at turn end. Debuffs cleared from body. |
| 70% | Fill charge diamonds | Lucilius immediately fills to full charge bar |
| 60%–56% | **Axion** (again) | Same as 85% version |
| 55% | **Iblis** | Multi-hit random element dmg to random allies; inflicts Petrified + Weakened + Slashed |

**OD Interaction (any time Black Wings is alive):**
- When BOTH Lucilius AND Black Wings are in **Overdrive** with full charge diamonds → they jointly cast **Paradise Lost (Elemental)**: ~120k random element dmg all allies, ignores elemental DMG cut, inflicts **Death Ineluctable** on any ally KO'd by this

**Black Wings – Seven Trumpets (at 35% of Black Wings HP):**
- Black Wings normal attacks permanently change to **multi-hit random element to all allies**

---

#### Phase 2 — 35% HP Trigger (LABOR PHASE)
The 35% trigger is the raid's defining moment. Two things happen simultaneously:

1. **Paradise Lost (Elemental)** fires (see above, ~120k random elem dmg)
2. Lucilius gains the **Twelve Labors** — 12 persistent buffs with custom clear conditions

**The Twelve Labors (simplified — original game has 12, adapted to 6 for implementation):**

| # | Name | Effect while active | Clear Condition |
|---|---|---|---|
| 1st | Pyre Labor | Fire ATK boosted | Deal ≥10,000,000 Fire DMG in 1 turn |
| 2nd | Flood Labor | Water ATK boosted | Deal ≥10,000,000 Water DMG in 1 turn |
| 3rd | Gale Labor | Wind ATK boosted | Deal ≥10,000,000 Wind DMG in 1 turn |
| 4th | Stone Labor | Earth ATK boosted | Deal ≥10,000,000 Earth DMG in 1 turn |
| 5th | Chain Labor | Nullifies all elemental DMG cut | Activate Charge Attack (CA) burst of 5+ chains |
| 6th | Stripping Labor | Removes 2 buffs from all allies each turn | Trigger Paradise Lost CA |
| 12th (final) | Harvest Labor | Deals 15,000 plain DMG to a random ally per turn | Clear ALL other Labors first |

---

#### Phase 3 — 25% → 0% HP (Endgame)
| HP% | Name | Effect |
|---|---|---|
| 25% | **Gopherwood Ark** | KOs allies that share race with other party members |
| 10% | **Paradise Lost (Apocalypse)** | Fills all charge diamonds + 999,999 random element dmg all allies |
| 3% | **Paradise Lost (Apocalypse)** | Same as 10% |

---

### Core Unique Mechanics (require engine extensions)

#### 1. Evangelist's Blade (Stacking Boss Buff)
- Lucilius gains +1 Evangelist's Blade stack **each time he uses a special attack**
- Each stack grants: ATK↑, DEF↑, DA rate↑, TA rate↑, debuff resist↑
- Stack count is reduced by 1 each time Lucilius **takes a Dispel** (buff-removal effect)
- This means players MUST use Dispel skills regularly to keep him manageable

#### 2. Wings of the Word (Damage Cap)
- Active from fight start until specific conditions remove it
- Caps damage dealt to Lucilius at **300,000 per turn** base
- Can be removed by attacking Lucilius while he is in **Break mode** (charge bar depleted)

#### 3. Grand Finale Countdown
- A countdown tracker initialized at **6**
- Counts down by 1 each time Lucilius **KOs an ally**
- When it reaches 0 → **The End** fires: instant KO all allies in all parties (raid wipe)

#### 4. Summonless Field
- All players cannot use summons for the duration of the debuff

#### 5. Multi-Entity Boss Structure
- Black Wings is a separate targetable entity with its own HP bar and triggers
- It must be integrated into the combat loop alongside the main body

---

## PART 2: SCHEMA DESIGN FOR SKY-CHRONICLE

### New Required Schema Fields

The current boss schema (`BOSSES` array in `server/src/data/catalog.js`) must be extended with:

```javascript
{
  // EXISTING fields stay unchanged
  id, name, element, hp_max, def, base_atk, charge_gain_per_turn,
  phases, triggers,

  // NEW: Sub-entities (additional targetable units in the same raid)
  sub_entities: [
    {
      id: 'BOSS003_WINGS',          // unique sub-entity ID
      name: 'Black Wings',
      element: 'DARK',
      hp_max: 80_000_000,
      def: 30,
      base_atk: 2500,
      charge_gain_per_turn: 20,
      triggers: [ /* same shape as boss triggers */ ],
      on_death: { /* effect that fires when this entity is killed */ },
    }
  ],

  // NEW: Boss-level passive stacking buff
  passive_stacks: {
    name: 'Evangelist\'s Blade',
    initial: 0,
    max: 10,
    per_special: +1,           // gain on each special cast
    per_dispel_taken: -1,      // lose on each dispel received
    effects_per_level: [
      { atk_bonus: 0.10, def_bonus: 0.10 },
      { atk_bonus: 0.20, def_bonus: 0.20, da_bonus: 0.10 },
      // ... etc
    ],
  },

  // NEW: Progressive conditional buffs (Labors)
  conditional_buffs: [
    {
      id: 'LABOR_1',
      name: 'First Labor',
      description: 'Fire ATK is boosted',
      effect: { type: 'ENEMY_ATK_BOOST', element: 'FIRE', amount: 0.30 },
      clear_condition: {
        type: 'ELEMENT_DAMAGE_IN_TURN',
        element: 'FIRE',
        threshold: 10_000_000,
      },
      active: false, // toggled true when Labor phase begins
    },
    // ... more labors
  ],

  // NEW: Countdown tracker (triggers raid wipe at 0)
  countdown: {
    name: 'Grand Finale',
    initial: 6,
    decrement_on: 'ALLY_KO',   // event that ticks it down
    on_zero: { type: 'RAID_WIPE', message: 'The End — all allies have fallen.' },
  },

  // NEW: Field effects applied at battle start
  field_on_join: [
    { type: 'SUMMONLESS', target: 'ALL_PLAYERS', duration: 999 },
  ],

  // NEW: Damage cap (Wings of the Word)
  damage_cap: {
    name: 'Wings of the Word',
    per_turn_cap: 300_000,
    remove_condition: 'ATTACKED_WHILE_BROKEN',
  },
}
```

---

### Complete BOSS003 Data Entry

```javascript
{
  id: 'BOSS003',
  name: 'Lucilius',
  element: 'NULL',   // NULL = takes neutral damage from all elements
  hp_max: 500_000_000,
  def: 50,
  base_atk: 4500,
  charge_gain_per_turn: 15,

  // ── Sub-entities ────────────────────────────────────────────
  sub_entities: [
    {
      id: 'BOSS003_WINGS',
      name: 'Black Wings',
      element: 'DARK',
      hp_max: 80_000_000,
      def: 30,
      base_atk: 2500,
      charge_gain_per_turn: 20,
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
        type: 'BOSS_BUFF',
        target: 'BOSS003',
        effect: 'REMOVE_BUFF',
        buff_name: 'Wings of the Word',
        description: 'Slaying Black Wings removes Wings of the Word from Lucilius.',
      },
    },
  ],

  // ── Passive Stacking Buff ───────────────────────────────────
  passive_stacks: {
    name: "Evangelist's Blade",
    current: 0,
    max: 10,
    per_special: 1,
    per_dispel_taken: -1,
    effects_per_level: [
      { level: 1,  atk_bonus: 0.10 },
      { level: 2,  atk_bonus: 0.20 },
      { level: 3,  atk_bonus: 0.30, def_bonus: 0.10 },
      { level: 5,  atk_bonus: 0.40, def_bonus: 0.20, charge_gain_per_turn_bonus: 3 },
      { level: 8,  atk_bonus: 0.50, def_bonus: 0.30, debuff_resist: 0.50 },
      { level: 10, atk_bonus: 0.60, def_bonus: 0.40, debuff_resist: 0.80 },
    ],
  },

  // ── Conditional Labor Buffs (activated at 35%) ──────────────
  conditional_buffs: [
    {
      id: 'LABOR_FIRE',
      name: 'First Labor',
      description: 'Fire ATK boosted — clear by dealing 10M+ Fire DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'FIRE', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'FIRE', threshold: 10_000_000 },
      active: false,
    },
    {
      id: 'LABOR_WATER',
      name: 'Second Labor',
      description: 'Water ATK boosted — clear by dealing 10M+ Water DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WATER', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WATER', threshold: 10_000_000 },
      active: false,
    },
    {
      id: 'LABOR_WIND',
      name: 'Third Labor',
      description: 'Wind ATK boosted — clear by dealing 10M+ Wind DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WIND', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WIND', threshold: 10_000_000 },
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

  // ── Grand Finale Countdown ──────────────────────────────────
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

  // ── Battle-Start Field Effects ──────────────────────────────
  field_on_join: [
    {
      type: 'DEBUFF_PLAYER',
      effect: 'SUMMONLESS',
      target: 'ALL_PLAYERS',
      duration: 999,
      description: 'Summons cannot be used.',
    },
  ],

  // ── Damage Cap (Wings of the Word) ──────────────────────────
  damage_cap: {
    name: 'Wings of the Word',
    active: true,
    per_turn_cap: 300_000,
    remove_condition: 'ATTACKED_WHILE_BROKEN',
    description: 'Damage Lucilius takes per player per turn is capped at 300,000 while Wings of the Word is active.',
  },

  // ── Phases ──────────────────────────────────────────────────
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
        dmg_multiplier: 0,   // plain damage, not scaled by ATK
        plain_damage: 30_000,
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
            random_elem_damage: 120_000,
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
        random_elem_damage: 120_000,
        ignores_elem_cut: true,
        target: 'ALL_ALLIES',
        effect: { type: 'DEBUFF', effect: 'DEATH_INELUCTABLE', on: 'KO_FROM_THIS_ATTACK' },
      },
    },
  ],

  // ── HP Triggers ─────────────────────────────────────────────
  triggers: [
    {
      hp_pct: 0.95,
      name: 'Phosphorus',
      action: {
        type: 'ATTACK_SINGLE',
        target: 'HIGHEST_ATK_ALLY',
        random_elem_damage: 210_000,
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
        random_elem_damage: 80_000,
        on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30_000, target: 'ALL_ALLIES' },
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
      action: {
        type: 'FILL_CHARGE_BAR',
        target: 'SELF',
      },
      description: 'Lucilius immediately fills his charge bar to maximum.',
      fired: false,
    },
    {
      hp_pct: 0.60,
      name: 'Axion (2nd)',
      action: {
        type: 'ATTACK_ALL',
        random_elem_damage: 80_000,
        on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30_000, target: 'ALL_ALLIES' },
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
        random_elem_damage: 50_000,
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
          { type: 'ATTACK_ALL', plain_damage: 999_999 },
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
          { type: 'ATTACK_ALL', plain_damage: 999_999 },
        ],
      },
      description: 'Second apocalypse trigger at 3% HP.',
      fired: false,
    },
  ],
}
```

---

## PART 3: ENGINE CHANGES REQUIRED

These are the systems that need to be added or modified in the Sky-Chronicle codebase. The BOSS003 data entry alone is inert without them.

### Files to modify:
- `server/src/data/catalog.js` — add BOSS003 entry (above)
- `server/src/engine/combat.js` — extend combat processing
- `server/src/raid/raidManager.js` — extend raid state
- `client/src/components/battle/BattleScreen.jsx` — extend UI

### New systems to implement:
1. **Sub-entity system** — second HP bar, trigger loop, on_death callback
2. **Evangelist's Blade** — counter on boss state, incremented by special dispatch, decremented by DISPEL-type skill effects
3. **Grand Finale Countdown** — decrement on ALLY_KO event, RAID_WIPE broadcast at 0
4. **Labor system** — conditional_buffs activated at trigger, per-turn effects applied in combat loop, clear-condition checks
5. **Damage cap** — cap applied server-side before HP deduction when `damage_cap.active === true`
6. **Random element damage** — pick random element from ['FIRE','WATER','WIND','EARTH','LIGHT','DARK'] on each hit

---

## PART 4: IMPLEMENTATION PROMPT FOR OTHER AI

---

> **PROMPT — paste this to your coding AI:**

---

You are working on **Sky-Chronicle**, a GBF-inspired browser RPG built with:
- **Client:** React 18 + Zustand + Socket.IO (Vite, port 5173)
- **Server:** Express + Socket.IO (Node ESM, port 3001), npm workspaces monorepo
- **Key files:**
  - `server/src/data/catalog.js` — boss/character/weapon data
  - `server/src/engine/combat.js` — damage calculation and combat loop
  - `server/src/raid/raidManager.js` — per-raid state machine
  - `client/src/components/battle/BattleScreen.jsx` — battle UI
  - `client/src/lib/ui.jsx` — shared UI primitives (BossHpBar, HpBar, etc.)

**CRITICAL WORKFLOW RULES:**
- Always **read existing files before modifying them**. Do NOT rewrite from scratch.
- Patch files in place using str_replace. New data belongs in its dedicated file.
- Do NOT create standalone replacement files.

---

### TASK: Implement the Lucilius (Impossible) raid boss

You are adding **BOSS003 — Lucilius** to Sky-Chronicle. This is a high-difficulty, multi-mechanic raid boss that requires both new data and new engine systems.

Below is the complete specification. Implement it in order, reading each file before touching it.

---

#### Step 1 — Add BOSS003 to catalog.js

Open `server/src/data/catalog.js` and add the following entry to the `BOSSES` array. Do not modify any existing entries.

**BOSS003 has the following new schema fields that existing bosses do not use. Add them to the BOSS003 entry only — do NOT retrofit existing bosses.**

New fields:
- `sub_entities: []` — array of secondary targetable units (same shape as a boss, with their own triggers and `on_death` callback)
- `passive_stacks: {}` — a stacking boss buff (Evangelist's Blade): gains +1 on each special, loses -1 on each Dispel received
- `conditional_buffs: []` — Labor buffs that activate at a trigger and have custom `clear_condition` objects
- `countdown: {}` — Grand Finale tracker that counts down on ALLY_KO and causes a raid wipe at 0
- `field_on_join: []` — field effects applied immediately when any player joins
- `damage_cap: {}` — per-turn damage cap (Wings of the Word), removable by attacking while boss is in Break

**Full BOSS003 data to insert:**

```javascript
{
  id: 'BOSS003',
  name: 'Lucilius',
  element: 'NULL',
  hp_max: 500_000_000,
  def: 50,
  base_atk: 4500,
  charge_gain_per_turn: 15,

  sub_entities: [
    {
      id: 'BOSS003_WINGS',
      name: 'Black Wings',
      element: 'DARK',
      hp_max: 80_000_000,
      def: 30,
      base_atk: 2500,
      charge_gain_per_turn: 20,
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
      { level: 1,  atk_bonus: 0.10 },
      { level: 2,  atk_bonus: 0.20 },
      { level: 3,  atk_bonus: 0.30, def_bonus: 0.10 },
      { level: 5,  atk_bonus: 0.40, def_bonus: 0.20, charge_gain_per_turn_bonus: 3 },
      { level: 8,  atk_bonus: 0.50, def_bonus: 0.30, debuff_resist: 0.50 },
      { level: 10, atk_bonus: 0.60, def_bonus: 0.40, debuff_resist: 0.80 },
    ],
  },

  conditional_buffs: [
    {
      id: 'LABOR_FIRE',
      name: 'First Labor',
      description: 'Fire ATK boosted — clear by dealing 10M+ Fire DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'FIRE', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'FIRE', threshold: 10_000_000 },
      active: false,
    },
    {
      id: 'LABOR_WATER',
      name: 'Second Labor',
      description: 'Water ATK boosted — clear by dealing 10M+ Water DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WATER', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WATER', threshold: 10_000_000 },
      active: false,
    },
    {
      id: 'LABOR_WIND',
      name: 'Third Labor',
      description: 'Wind ATK boosted — clear by dealing 10M+ Wind DMG in 1 turn',
      effect: { type: 'ENEMY_ELEM_ATK_BOOST', element: 'WIND', bonus_dmg: 0.30 },
      clear_condition: { type: 'ELEMENT_DAMAGE_IN_TURN', element: 'WIND', threshold: 10_000_000 },
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
    per_turn_cap: 300_000,
    remove_condition: 'ATTACKED_WHILE_BROKEN',
    description: 'Damage to Lucilius per player per turn is capped at 300,000.',
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
      },
      charge_attack: {
        name: 'Paradise Lost',
        plain_damage: 30_000,
        is_plain: true,
        target: 'ALL_ALLIES',
        effect: [
          { type: 'FIELD_DEBUFF', effect: 'SUMMONLESS', target: 'ALL_PLAYERS', duration: 999 },
          { type: 'BOSS_BUFF', buff: 'Wings of the Word', duration: 999 },
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
            type: 'ATTACK_ALL',
            name: 'Paradise Lost (Elemental)',
            random_elem_damage: 120_000,
            ignores_elem_cut: true,
            target: 'ALL_ALLIES',
            effect: { type: 'DEBUFF', effect: 'DEATH_INELUCTABLE', on: 'KO_FROM_THIS_ATTACK' },
          },
          {
            type: 'ACTIVATE_CONDITIONAL_BUFFS',
            buff_ids: ['LABOR_FIRE','LABOR_WATER','LABOR_WIND','LABOR_CHAIN','LABOR_STRIP','LABOR_FINAL'],
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
        random_elem_damage: 120_000,
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
        random_elem_damage: 210_000,
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
        random_elem_damage: 80_000,
        on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30_000, target: 'ALL_ALLIES' },
      },
      description: 'Random element damage to all allies. If any ally KO\'d, extra 30k plain dmg to all.',
      fired: false,
    },
    {
      hp_pct: 0.75,
      name: 'Atheism',
      action: {
        type: 'MULTI',
        actions: [
          { type: 'BOSS_BUFF', buff: 'Renunciation', duration: 999 },
          { type: 'CLEAR_DEBUFFS_ON_SELF' },
        ],
        remove_if: { type: 'DEBUFF_COUNT_ON_SELF', count: 6, check: 'TURN_END' },
      },
      description: 'Lucilius gains Renunciation (debuff resistance). Clears his debuffs. Removed if he has ≥6 debuffs at turn end.',
      fired: false,
    },
    {
      hp_pct: 0.70,
      name: 'Wrath of Heaven',
      action: { type: 'FILL_CHARGE_BAR', target: 'SELF' },
      description: 'Lucilius fills his charge bar to maximum.',
      fired: false,
    },
    {
      hp_pct: 0.60,
      name: 'Axion (2nd)',
      action: {
        type: 'ATTACK_ALL',
        random_elem_damage: 80_000,
        on_ko: { type: 'EXTRA_PLAIN_DAMAGE', damage: 30_000, target: 'ALL_ALLIES' },
      },
      description: 'Second Axion trigger.',
      fired: false,
    },
    {
      hp_pct: 0.55,
      name: 'Iblis',
      action: {
        type: 'ATTACK_RANDOM',
        hits: 5,
        random_elem_damage: 50_000,
        effect: [
          { type: 'DEBUFF', stat: 'PETRIFIED', duration: 1 },
          { type: 'DEBUFF', stat: 'WEAKENED', amount: -0.25, duration: 2 },
          { type: 'DEBUFF', stat: 'SLASHED', amount: -0.25, duration: 2 },
        ],
      },
      description: 'Multi-hit random element damage to random allies. Inflicts Petrified, Weakened, Slashed.',
      fired: false,
    },
    {
      hp_pct: 0.25,
      name: 'Gopherwood Ark',
      action: {
        type: 'KO_DUPLICATE_RACE',
        description: 'KOs all allies sharing a race with another ally. First of each race is spared.',
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
          { type: 'ATTACK_ALL', plain_damage: 999_999, is_plain: true },
        ],
      },
      description: 'Fills charge bar, then deals 999,999 plain damage to all allies.',
      fired: false,
    },
    {
      hp_pct: 0.03,
      name: 'Paradise Lost (Final)',
      action: {
        type: 'MULTI',
        actions: [
          { type: 'FILL_CHARGE_BAR', target: 'SELF' },
          { type: 'ATTACK_ALL', plain_damage: 999_999, is_plain: true },
        ],
      },
      description: 'Final apocalypse trigger at 3% HP.',
      fired: false,
    },
  ],
}
```

---

#### Step 2 — Extend raidManager.js (server state)

Read `server/src/raid/raidManager.js` first. Then extend the raid state initialization and event loop to support:

1. **Sub-entity state**: When creating a raid for BOSS003, initialize a `subEntities` map alongside the main boss state. Each sub-entity gets its own `hp`, `hp_max`, `charge_bar`, `triggers`, and `isAlive` flag. The sub-entity combat runs **after** the main boss attack each turn.

2. **Evangelist's Blade tracking**: Add `passiveStackLevel: 0` to boss state. After each boss special attack, increment it (capped at `passive_stacks.max`). When a player's skill has `type: 'DISPEL'`, decrement it (floor at 0). Apply the matching `effects_per_level` entry to the boss's effective ATK/DEF each turn.

3. **Grand Finale Countdown**: Add `grandFinaleCount` to raid state, initialized from `boss.countdown.current`. Subscribe to ALLY_KO events — decrement the counter. When it reaches 0, emit a `raid_wipe` event to all players with the boss's `countdown.on_zero.message`.

4. **Labor tracking**: Add `laborProgress` object to raid state that tracks per-turn elemental damage dealt by each element, chain burst count, and which labors have been cleared. At turn end, evaluate each active `conditional_buff`'s `clear_condition` against this turn's data. If condition met, mark the labor as cleared and broadcast a `labor_cleared` event.

5. **Damage cap**: Before applying damage to boss HP, if `boss.damage_cap.active === true`, cap the `playerDamageThisTurn[playerId]` accumulator at `damage_cap.per_turn_cap`. When the boss exits Break mode (charge bar depleted and recovered), check `remove_condition === 'ATTACKED_WHILE_BROKEN'` — if the boss was damaged during Break, set `damage_cap.active = false` and broadcast `wings_removed`.

6. **field_on_join**: When a player joins a raid with `field_on_join` defined, broadcast a `field_effect_applied` event to that player's socket with the debuff payload.

---

#### Step 3 — Extend combat.js

Read `server/src/engine/combat.js` first. Then add support for the following new action types used in BOSS003's triggers and phases:

- `ATTACK_SINGLE` with `target: 'HIGHEST_ATK_ALLY'` — find the player with highest effective ATK, deal `random_elem_damage` to them (pick random element), then apply effects
- `ATTACK_ALL` with `random_elem_damage` — deal that amount to all living allies (element determined randomly per ally hit)
- `ATTACK_RANDOM` with `hits` — hit random living allies that many times
- `FILL_CHARGE_BAR` on self — set boss charge bar to 100%
- `CLEAR_DEBUFFS_ON_SELF` — clear all boss debuffs from raid state
- `BOSS_BUFF` — add a named buff to boss's active buff list
- `KO_DUPLICATE_RACE` — requires a `race` property on each character in catalog; find duplicate races among living allies, KO all but the first of each race
- `ACTIVATE_CONDITIONAL_BUFFS` — set `active: true` on listed buff IDs in the boss's `conditional_buffs` array
- `RANDOM` element selection — `const ELEMENTS = ['FIRE','WATER','WIND','EARTH','LIGHT','DARK']; const elem = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];`

For the Renunciation buff (`remove_if: { type: 'DEBUFF_COUNT_ON_SELF', count: 6, check: 'TURN_END' }`): at the end of each turn in the combat loop, count active debuffs on the boss. If ≥ 6 and Renunciation is active, remove it from boss buffs.

---

#### Step 4 — Extend BattleScreen.jsx (client UI)

Read `client/src/components/battle/BattleScreen.jsx` first. Then add the following UI elements when the raid boss is BOSS003:

1. **Sub-entity HP bar** — If `raidState.subEntities` has entries, render a secondary HP bar below the main boss HP bar for each sub-entity. Use the existing `BossHpBar` component from `lib/ui.jsx`. Label it with the sub-entity's name and element badge.

2. **Grand Finale Countdown** — If `raidState.grandFinaleCount !== undefined`, render a countdown widget in the top-right corner. Show the count as a large number with a skull icon. Pulse red when count ≤ 2.

3. **Evangelist's Blade stack indicator** — If `raidState.passiveStackLevel !== undefined`, render a small stack badge next to the boss name showing current level (e.g. "Blade Lv.3").

4. **Active Labor list** — If `raidState.activeLabors` is non-empty, render a collapsible panel below the boss section listing each active Labor by name, its effect description, and its clear condition. Cleared labors shown with a strikethrough.

5. **Wings of the Word indicator** — If `raidState.damageCap?.active`, show a golden shield badge on the boss HP bar with the cap amount (e.g. "⊘ 300k").

---

#### Step 5 — Socket event wiring

Ensure the following new socket events are emitted by the server and handled by the client store (`store/gameStore.js`):

| Event name | Payload | Client action |
|---|---|---|
| `labor_cleared` | `{ laborId, laborName }` | Remove from activeLabors, show toast |
| `wings_removed` | `{}` | Set `damageCap.active = false` on local state |
| `grand_finale_tick` | `{ count }` | Update countdown display |
| `raid_wipe` | `{ message }` | Show full-screen wipe overlay, disable all actions |
| `sub_entity_died` | `{ entityId }` | Remove sub-entity HP bar |
| `passive_stack_change` | `{ level }` | Update Evangelist's Blade display |

---

#### Notes
- For any mechanic whose clear condition cannot be evaluated yet (e.g. `KO_DUPLICATE_RACE` requiring a `race` field on characters), add the field to the existing character catalog entries (`C001`–`C005`) as `race: 'UNKNOWN'` as a placeholder.
- Do not break existing BOSS001 or BOSS002 combat paths. All new logic should be gated behind checks like `if (boss.sub_entities)`, `if (boss.passive_stacks)`, etc.
- Keep the existing damage formula (`base_atk × normal × omega × ex × elem × crit × mult − def`) intact. The new mechanics apply on top of it.
