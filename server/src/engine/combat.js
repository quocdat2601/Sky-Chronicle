// ─────────────────────────────────────────────────────────────────────────────
// COMBAT ENGINE  — Server-side authoritative game logic
// ─────────────────────────────────────────────────────────────────────────────
import { ELEMENT_ADVANTAGE } from '../data/constants.js';

// ── DAMAGE CAPS ───────────────────────────────────────────────────────────────
// Source: GBF_Weapon_Skills_Research.xlsx "Damage Caps" tab
// NA soft cap ~440k, CA soft cap ~1.16M (xlsx values used as primary source)
const NA_CAP_BASE        = 440_000;
const CA_CAP_BASE        = 1_160_000;
const CB_CAP_BASE        = 2_000_000;  // Chain Burst soft cap
const SKILL_CAP_BASE     = 490_000;    // Skill damage baseline (varies per skill)
const NA_CAP_HARD        = 2_000_000;
const CA_CAP_HARD        = 6_000_000;
const CB_CAP_HARD        = 20_000_000;
const NA_CAP_WEAPON_MAX  = 0.20;       // weapon pool: max +20% on NA cap
const CA_CAP_WEAPON_MAX  = 1.00;       // weapon pool: max +100% on CA cap
const CB_CAP_WEAPON_MAX  = 1.00;
const SKILL_CAP_WEAPON_MAX = 1.00;
const SERAPHIC_CAP       = 0.20;
const DA_RATE_CAP        = 1.00;
const TA_RATE_CAP        = 0.50;
const CRIT_RATE_CAP      = 1.00;
const DEF_FLOOR_RATIO    = 0.50;       // DEF can't drop below 50% of base (wiki)
const SUPP_CAP           = 100_000;    // supplemental flat cap
const CHARGE_SPEED_CAP   = 0.75;       // Progression 75% total cap

// ── SOFT CAP WITH DIMINISHING RETURNS ─────────────────────────────────────────
// Between soft and hard: 30% of overage passes through.
// Past hard: 0.1% passes through.
function applySoftCap(raw, soft, hard) {
  if (raw <= soft) return Math.round(raw);
  const after_soft = soft + (raw - soft) * 0.3;
  if (after_soft <= hard) return Math.round(after_soft);
  return Math.round(hard + (after_soft - hard) * 0.001);
}

// ── SKILL CAP: two-stage T1/T2 threshold system ───────────────────────────────
// Source: xlsx "Damage Caps" tab — "Skill Damage Threshold Reduction System"
// T1 = base × (1 + skill_cap_bonus)
// T2 = T1 × 2  (approximate)
// Below T1:    standard diminishing returns (30% of overage)
// T1 → T2:     80% reduction (only 20% passes)
// Past T2:     99.9% reduction
// EXEMPT: skills with dmg_multiplier ≥ 6.01 (601%) use standard cap instead
function applySkillCap(raw, skill_cap_bonus, skill_multiplier = 1.0) {
  if (skill_multiplier >= 6.01) {
    return applySoftCap(raw, SKILL_CAP_BASE * (1 + skill_cap_bonus), NA_CAP_HARD);
  }
  const T1 = SKILL_CAP_BASE * (1 + skill_cap_bonus);
  const T2 = T1 * 2;
  if (raw <= T1) return applySoftCap(raw, T1, T2 * 5);
  if (raw <= T2) return Math.round(T1 + (raw - T1) * 0.20);
  return Math.round(T2 + (raw - T2) * 0.001);
}

// ── ELEMENT MODIFIER ──────────────────────────────────────────────────────────
export function getElementModifier(attackerElement, defenderElement) {
  const adv = ELEMENT_ADVANTAGE[attackerElement];
  if (!adv) return 1.0;
  if (adv.strong === defenderElement) return 1.5;
  if (adv.weak   === defenderElement) return 0.75;
  return 1.0;
}

// ── WEAPON SKILL MAGNITUDE ────────────────────────────────────────────────────
export function calcSkillMagnitude(skill) {
  return skill.magnitude_base + (skill.skill_level - 1) * skill.magnitude_per_level;
}

// ── HP CURVE FORMULAS (from gbf.wiki) ─────────────────────────────────────────
// Stamina: linear — full value at 100% HP, zero at 0%
function staminaCurve(hp_ratio) {
  return Math.max(0, Math.min(1, hp_ratio));
}
// Enmity: cubic — peaks at ~3× at near-zero HP
// Formula: (1 + 2×missing) × missing   where missing = 1 − hp_ratio
// At 0% HP → 3.0, at 50% HP → 1.0, at 100% HP → 0
function enmityCurve(hp_ratio) {
  const missing = 1 - Math.max(0, Math.min(1, hp_ratio));
  return (1 + 2 * missing) * missing;
}

// ── GRID STATS ────────────────────────────────────────────────────────────────
// Processes every weapon skill into the stats object used by calcDamage().
// Raw bracket sums stored before summon aura is applied (aura applied at hit time).
// Source: xlsx "Skill Types Reference" + "Damage Formula" tabs.
export function calcGridStats(weapons /* Weapon[] */) {
  // ── Raw ATK bracket sums (pre-aura) ───────────────────────────────────────
  let normal_sum = 0, omega_sum = 0, ex_sum = 0;
  // ── HP-conditional sub-boost sums (pre-aura) ──────────────────────────────
  let normal_stam = 0, omega_stam = 0, ex_stam = 0;
  let normal_enm  = 0, omega_enm  = 0, ex_enm  = 0;
  // ── Utility ───────────────────────────────────────────────────────────────
  let crit_sum = 0, da_rate_sum = 0, ta_rate_sum = 0;
  let charge_speed_sum = 0;
  // ── Damage cap pools (weapon-limited) ─────────────────────────────────────
  let na_cap_sum = 0, ca_cap_sum = 0, skill_cap_sum = 0, cb_cap_sum = 0;
  // ── Post-formula ──────────────────────────────────────────────────────────
  let seraphic_sum = 0;
  let supp_flat = 0;  // flat damage per hit — NOT a percentage
  // ── Totals ────────────────────────────────────────────────────────────────
  let grid_atk = 0, grid_hp = 0;

  for (const w of weapons) {
    if (!w) continue;
    grid_atk += w.base_atk;
    grid_hp  += w.base_hp;

    for (const skill of (w.skills || [])) {
      const mag = calcSkillMagnitude(skill);
      switch (skill.skill_type) {
        // ── Flat ATK ──────────────────────────────────────────────────────────
        case 'ATK_NORMAL':     normal_sum  += mag; break;
        case 'ATK_OMEGA':      omega_sum   += mag; break;
        case 'ATK_EX':         ex_sum      += mag; break;

        // ── Stamina (all 3 brackets) ──────────────────────────────────────────
        case 'STAMINA_NORMAL': normal_stam += mag; break;
        case 'STAMINA_OMEGA':  omega_stam  += mag; break;
        case 'STAMINA_EX':     ex_stam     += mag; break;
        // Legacy key — treat as normal bracket
        case 'STAMINA':        normal_stam += mag; break;

        // ── Enmity (all 3 brackets) ───────────────────────────────────────────
        case 'ENMITY_NORMAL':  normal_enm  += mag; break;
        case 'ENMITY_OMEGA':   omega_enm   += mag; break;
        case 'ENMITY_EX':      ex_enm      += mag; break;
        // Legacy key
        case 'ENMITY':         normal_enm  += mag; break;

        // ── Majesty (ATK + HP) ────────────────────────────────────────────────
        case 'MAJESTY_NORMAL': normal_sum += mag; grid_hp += w.base_hp * mag; break;
        case 'MAJESTY_OMEGA':  omega_sum  += mag; break;
        case 'MAJESTY_EX':     ex_sum     += mag; break;

        // ── HP pool (handled in raidManager on join; grid_hp already summed) ──
        case 'HP_BOOST':
        case 'HP_BOOST_OMEGA':
        case 'HP_BOOST_EX':    break;

        // ── Utility ───────────────────────────────────────────────────────────
        case 'CRITICAL_RATE':  crit_sum        += mag; break;
        case 'DA_RATE':        da_rate_sum     += mag; break;
        case 'TA_RATE':        ta_rate_sum     += mag; break;
        // TRIUM = DA + TA simultaneously (3-bolt icon)
        case 'TRIUM':          da_rate_sum     += mag; ta_rate_sum += mag; break;
        // RESTRAINT = DA + Crit
        case 'RESTRAINT':      da_rate_sum     += mag; crit_sum    += mag; break;
        // CELERE = ATK + Crit (ATK goes into normal bracket)
        case 'CELERE':         normal_sum      += mag; crit_sum    += mag; break;
        // Progression — accumulates each turn; stored for charge bar calc
        case 'CHARGE_SPEED':
        case 'PROG_NORMAL':
        case 'PROG_OMEGA':
        case 'PROG_EX':        charge_speed_sum += mag; break;

        // ── Damage cap pools ──────────────────────────────────────────────────
        case 'DMG_CAP_NA':     na_cap_sum    += mag; break;
        case 'DMG_CAP_CA':     ca_cap_sum    += mag; break;
        case 'SKILL_DMG_CAP':  skill_cap_sum += mag; break;

        // ── Post-formula ──────────────────────────────────────────────────────
        case 'ELEM_AMPLIFY':   seraphic_sum += mag; break;
        // magnitude is FLAT damage value (e.g. 48000), not a percentage
        case 'SUPPLEMENTAL':   supp_flat    += mag; break;
      }
    }
  }

  return {
    grid_atk,
    grid_hp,

    // Raw bracket sums — summon aura applied in calcDamage at hit time
    normal_sum,   omega_sum,   ex_sum,
    normal_stam,  omega_stam,  ex_stam,
    normal_enm,   omega_enm,   ex_enm,

    // Legacy keys kept for any existing callers that read normal_mult directly
    // These are pre-aura and pre-stamina/enmity; calcDamage uses the raw sums
    normal_mult: 1 + normal_sum,
    omega_mult:  1 + omega_sum,
    ex_mult:     1 + ex_sum,

    // Utility (capped)
    crit_rate:          Math.min(crit_sum,         CRIT_RATE_CAP),
    da_rate:            Math.min(da_rate_sum,       DA_RATE_CAP),
    ta_rate:            Math.min(ta_rate_sum,       TA_RATE_CAP),
    charge_speed_bonus: Math.min(charge_speed_sum,  CHARGE_SPEED_CAP),

    // Cap pool sums (clamped to weapon-pool max when applied)
    na_cap_bonus:    Math.min(na_cap_sum,    NA_CAP_WEAPON_MAX),
    ca_cap_bonus:    Math.min(ca_cap_sum,    CA_CAP_WEAPON_MAX),
    skill_cap_bonus: Math.min(skill_cap_sum, SKILL_CAP_WEAPON_MAX),
    cb_cap_bonus:    Math.min(cb_cap_sum,    CB_CAP_WEAPON_MAX),

    // Post-formula
    seraphic_bonus: Math.min(seraphic_sum, SERAPHIC_CAP),
    supp_flat:      Math.min(supp_flat,    SUPP_CAP),
  };
}

// ── GET STAMINA/ENMITY MODIFIER (per-hit, HP-conditional) ────────────────────
// Returns the combined stamina+enmity addend folded into the normal bracket.
// Summon aura is applied here using the same aura mults as calcDamage.
function getStaminaEnmityMod(gridStats, hp_ratio, optimus_aura_mult, omega_aura_mult) {
  const stam = staminaCurve(hp_ratio);
  const enm  = enmityCurve(hp_ratio);

  // Each sub-boost is its own × factor per the xlsx formula sheet.
  // For simplicity in the existing formula structure (which adds into normal_mult),
  // we return the combined addend: caller does  eff_normal = normal_mult × stam_mult × enm_mult
  const stam_normal = gridStats.normal_stam * optimus_aura_mult * stam;
  const stam_omega  = gridStats.omega_stam  * omega_aura_mult   * stam;
  const stam_ex     = gridStats.ex_stam     * stam;
  const enm_normal  = gridStats.normal_enm  * optimus_aura_mult * enm;
  const enm_omega   = gridStats.omega_enm   * omega_aura_mult   * enm;
  const enm_ex      = gridStats.ex_enm      * enm;

  return { stam_normal, stam_omega, stam_ex, enm_normal, enm_omega, enm_ex };
}

// ── DAMAGE FORMULA ────────────────────────────────────────────────────────────
// Full formula from xlsx "Damage Formula" tab:
//   CharATK × Elemental × Normal × NormalStam × NormalEnm
//           × Omega × OmegaStam × OmegaEnm
//           × EX × EXStam × EXEnm
//           × UniqueMisc
//   ÷ DEF (floored at 50% of base_def)
//   → seraphic (if vs weak element, BEFORE cap)
//   → damage cap (type-specific, with diminishing returns)
//   → + supplemental (FLAT, immune to DEF/ATK/caps)
//   → × 1.5 if crit
//
// Returns { damage, base_damage, supp_damage, is_crit, element_mod }
export function calcDamage({
  attacker,       // { base_atk, element, hp, hp_max, atk_up, atk_down }
  gridStats,      // from calcGridStats
  weapons,        // raw weapons array (kept for backward compat, unused now)
  defender,       // { def, element, def_down }
  dmg_multiplier, // 1.0 for normal attack; ca_def.value.dmg_multiplier for CA/skill
  is_ca = false,
  is_skill = false,
  skill_multiplier_for_cap = null,  // pass the raw multiplier value for T1/T2 exempt check
  // Summon auras — pass from raid state if available; default to no aura
  optimus_aura = 0,  // addend: 0.5 = ×1.5 on Normal bracket skills
  omega_aura   = 0,  // addend: 0.5 = ×1.5 on Omega bracket skills
  // In-battle buffs
  unique_mult  = 1.0,  // char unique / crew / assassin composite
  // Progression Ele.ATK (grows per turn, passed from battle state)
  progression_ele_atk = 0,
  ele_atk_buffs       = 0,
}) {
  const {
    normal_sum, omega_sum, ex_sum,
    crit_rate, seraphic_bonus, supp_flat,
    na_cap_bonus, ca_cap_bonus, skill_cap_bonus,
  } = gridStats;

  // ── Summon aura multipliers ────────────────────────────────────────────────
  const norm_aura  = 1 + optimus_aura;   // e.g. 1.5 for Optimus at base
  const omega_aura_m = 1 + omega_aura;   // e.g. 1.5 for Omega summon at base

  // ── HP ratio for stamina/enmity curves ────────────────────────────────────
  const hp_ratio = attacker.hp_max > 0
    ? Math.max(0, Math.min(1, attacker.hp / attacker.hp_max))
    : 1.0;

  // ── Stamina/enmity sub-boost components ───────────────────────────────────
  const se = getStaminaEnmityMod(gridStats, hp_ratio, norm_aura, omega_aura_m);

  // ── ATK buffs on the attacker ──────────────────────────────────────────────
  const atk_buff_mult = 1 + (attacker.atk_up || 0) - (attacker.atk_down || 0);

  // ── Elemental boost bracket ───────────────────────────────────────────────
  // × (1 + elem_advantage + progression_ele_atk + ele_atk_buffs)
  const element_mod  = getElementModifier(attacker.element, defender.element);
  const elem_adv     = element_mod - 1.0;  // 0.5, 0, or -0.25
  const elemental_boost = 1 + elem_adv + progression_ele_atk + ele_atk_buffs;

  // ── Normal bracket: (1 + flat×aura) × (1 + stam×aura) × (1 + enm×aura) ──
  const normal_boost = (1 + normal_sum * norm_aura)
    * (1 + se.stam_normal)
    * (1 + se.enm_normal);

  // ── Omega bracket ─────────────────────────────────────────────────────────
  const omega_boost = (1 + omega_sum * omega_aura_m)
    * (1 + se.stam_omega)
    * (1 + se.enm_omega);

  // ── EX bracket ────────────────────────────────────────────────────────────
  const ex_boost = (1 + ex_sum)
    * (1 + se.stam_ex)
    * (1 + se.enm_ex);

  // ── DEF (floored at 50% of base per wiki) ─────────────────────────────────
  const base_def   = defender.def || 10;
  const def_floor  = base_def * DEF_FLOOR_RATIO;
  const eff_def    = Math.max(def_floor, base_def * (1 + (defender.def_down || 0)));

  // ── Base ATK ───────────────────────────────────────────────────────────────
  const base_atk = (attacker.base_atk + gridStats.grid_atk) * atk_buff_mult;

  // ── Main formula ───────────────────────────────────────────────────────────
  const raw = base_atk
    * elemental_boost
    * normal_boost
    * omega_boost
    * ex_boost
    * unique_mult
    * dmg_multiplier
    / Math.max(1, eff_def);

  // ── Seraphic (BEFORE cap, only when hitting weak element) ─────────────────
  const is_on_element = elem_adv > 0;
  const after_seraphic = (is_on_element && seraphic_bonus > 0)
    ? raw * (1 + seraphic_bonus)
    : raw;

  // ── Crit roll ─────────────────────────────────────────────────────────────
  const is_crit   = Math.random() < crit_rate;
  const crit_mod  = is_crit ? 1.5 : 1.0;
  const after_crit = after_seraphic * crit_mod;

  // ── Damage cap by attack type ─────────────────────────────────────────────
  let capped;
  if (is_ca) {
    capped = applySoftCap(
      after_crit,
      CA_CAP_BASE * (1 + ca_cap_bonus),
      CA_CAP_HARD,
    );
  } else if (is_skill) {
    capped = applySkillCap(after_crit, skill_cap_bonus, skill_multiplier_for_cap ?? dmg_multiplier);
  } else {
    capped = applySoftCap(
      after_crit,
      NA_CAP_BASE * (1 + na_cap_bonus),
      NA_CAP_HARD,
    );
  }

  // ── Supplemental (flat, AFTER cap, immune to DEF/ATK) ─────────────────────
  const supp_damage = Math.floor(supp_flat);
  const total = Math.max(0, capped) + supp_damage;

  return {
    damage:       total,
    base_damage:  Math.max(0, capped),  // pre-supp, for logging
    supp_damage,
    is_crit,
    element_mod,
  };
}

// ── APPLY STATUS EFFECT ───────────────────────────────────────────────────────
export function applyStatusEffect(target_state, effect) {
  if (!target_state.status_effects) target_state.status_effects = [];
  // No stacking same type in MVP — last write wins
  target_state.status_effects = target_state.status_effects.filter(
    e => e.type !== effect.type
  );
  target_state.status_effects.push({ ...effect });
  return target_state;
}

// ── TICK STATUS EFFECTS ───────────────────────────────────────────────────────
export function tickStatusEffects(combatant_state) {
  const log = [];
  if (!combatant_state.status_effects) return log;

  for (const eff of combatant_state.status_effects) {
    if (eff.type === 'BURN' || eff.type === 'POISON') {
      combatant_state.hp = Math.max(0, combatant_state.hp - eff.damage);
      log.push({ type: 'DOT', source: eff.type, damage: eff.damage, target_id: combatant_state.id });
    }
    if (eff.type === 'REGEN') {
      combatant_state.hp = Math.min(combatant_state.hp_max, combatant_state.hp + eff.heal);
      log.push({ type: 'REGEN', heal: eff.heal, target_id: combatant_state.id });
    }
  }

  combatant_state.status_effects = combatant_state.status_effects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0);

  return log;
}

// ── CHARGE BAR UPDATE ─────────────────────────────────────────────────────────
export function updateChargeBar(char_state, base_gain, charge_speed_bonus) {
  const slow  = char_state.status_effects?.find(e => e.type === 'SLOW')?.amount || 0;
  const haste = char_state.status_effects?.find(e => e.stat === 'CHARGE')?.amount || 0;
  const eff_gain = base_gain * (1 + charge_speed_bonus + haste + slow);
  char_state.charge_bar = Math.min(100, char_state.charge_bar + Math.floor(eff_gain));
  return char_state.charge_bar >= 100;
}

// ── RESOLVE PLAYER TURN ───────────────────────────────────────────────────────
export function resolvePlayerAction({ action, player_state, boss_state, grid_stats, weapons }) {
  const log = [];

  if (action.type === 'GUARD') {
    player_state.guarding = true;
    log.push({ type: 'GUARD', player_id: player_state.player_id });
    return { log, player_state, boss_state };
  }

  if (action.type === 'ATTACK' || action.type === 'AUTO') {
    const ca_triggered = [];
    const { da_rate = 0, ta_rate = 0 } = grid_stats;

    for (const char of player_state.characters) {
      if (char.hp <= 0) continue;

      const da_proc   = Math.random() < da_rate;
      const ta_proc   = da_proc && Math.random() < ta_rate;
      const hit_count = ta_proc ? 3 : da_proc ? 2 : 1;
      const hit_type  = ta_proc ? 'TA' : da_proc ? 'DA' : 'NORMAL';

      const attacker_ctx = {
        ...char,
        base_atk: char.base_atk,
        element:  char.element,
        hp:       char.hp,
        hp_max:   char.hp_max,
        atk_up:   getBuffAmount(char, 'ATK', 'up'),
        atk_down: getBuffAmount(char, 'ATK', 'down'),
      };
      const defender_ctx = {
        def:      boss_state.def,
        element:  boss_state.element,
        def_down: getDebuffAmount(boss_state, 'DEF'),
      };

      const hit_results = [];
      let total_hit_damage = 0;

      for (let h = 0; h < hit_count; h++) {
        const result = calcDamage({
          attacker:       attacker_ctx,
          gridStats:      grid_stats,
          weapons,
          defender:       defender_ctx,
          dmg_multiplier: 1.0,
        });
        boss_state.hp = Math.max(0, boss_state.hp - result.damage);
        total_hit_damage += result.damage;
        hit_results.push({
          damage:      result.damage,
          base_damage: result.base_damage,
          supp_damage: result.supp_damage,
          is_crit:     result.is_crit,
        });
      }

      log.push({
        type:      'NORMAL_ATTACK',
        char_id:   char.id,
        char_name: char.name,
        hit_type,
        hit_count,
        hit_results,
        damage:    total_hit_damage,
        is_crit:   hit_results.some(h => h.is_crit),
        has_supp:  hit_results.some(h => h.supp_damage > 0),
      });

      const ca_ready = updateChargeBar(char, char.charge_gain_per_turn, grid_stats.charge_speed_bonus);
      if (ca_ready) ca_triggered.push(char);
    }

    // ── Charge Attacks ────────────────────────────────────────────────────────
    const ca_damages = [];
    for (const char of ca_triggered) {
      const ca_def    = char.charge_attack;
      const ca_result = calcDamage({
        attacker:       { ...char, base_atk: char.base_atk, element: char.element, hp: char.hp, hp_max: char.hp_max },
        gridStats:      grid_stats,
        weapons,
        defender:       { def: boss_state.def, element: boss_state.element, def_down: getDebuffAmount(boss_state, 'DEF') },
        dmg_multiplier: ca_def.value.dmg_multiplier,
        is_ca:          true,
      });
      boss_state.hp = Math.max(0, boss_state.hp - ca_result.damage);
      char.charge_bar = 0;
      ca_damages.push({ char_id: char.id, char_name: char.name, damage: ca_result.damage });
      log.push({
        type:        'CHARGE_ATTACK',
        char_id:     char.id,
        char_name:   char.name,
        ca_name:     ca_def.name,
        damage:      ca_result.damage,
        base_damage: ca_result.base_damage,
        supp_damage: ca_result.supp_damage,
        is_crit:     ca_result.is_crit,
      });

      if (ca_def.value.buff) {
        applyStatusEffect(player_state, { ...ca_def.value.buff, type: ca_def.value.buff.stat + '_UP', target_id: 'party' });
      }
    }

    // ── Chain Burst ───────────────────────────────────────────────────────────
    if (ca_triggered.length >= 2) {
      const chain_count = Math.min(ca_triggered.length, 4);
      const bonuses    = { 2: 0.25, 3: 0.50, 4: 1.00 };
      const bonus_pct  = bonuses[chain_count] || 0;
      const cb_bonus   = Math.floor(ca_damages.reduce((s, c) => s + c.damage, 0) * bonus_pct);
      boss_state.hp = Math.max(0, boss_state.hp - cb_bonus);
      log.push({ type: 'CHAIN_BURST', chain_count, bonus_pct, cb_bonus, participants: ca_triggered.map(c => c.name) });
    }
  }

  // ── Use Ability ───────────────────────────────────────────────────────────
  if (action.type === 'USE_ABILITY') {
    const char = player_state.characters.find(c => c.id === action.char_id);
    if (!char || char.hp <= 0) {
      log.push({ type: 'ERROR', msg: 'Character not available' });
      return { log, player_state, boss_state };
    }
    const ability = char.abilities.find(a => a.id === action.ability_id);
    if (!ability || (char.ability_cooldowns?.[ability.id] || 0) > 0) {
      log.push({ type: 'ERROR', msg: 'Ability not ready' });
      return { log, player_state, boss_state };
    }

    if (!char.ability_cooldowns) char.ability_cooldowns = {};
    char.ability_cooldowns[ability.id] = ability.cooldown_max;

    if (ability.effect_type === 'DAMAGE') {
      const result = calcDamage({
        attacker:       { ...char, element: char.element, hp: char.hp, hp_max: char.hp_max },
        gridStats:      grid_stats,
        weapons,
        defender:       { def: boss_state.def, element: boss_state.element, def_down: getDebuffAmount(boss_state, 'DEF') },
        dmg_multiplier: ability.value.dmg_multiplier,
        is_skill:       true,
        skill_multiplier_for_cap: ability.value.dmg_multiplier,
      });
      boss_state.hp = Math.max(0, boss_state.hp - result.damage);
      log.push({ type: 'ABILITY', char_name: char.name, ability_name: ability.name, damage: result.damage, is_crit: result.is_crit });

      if (ability.value.debuff) { applyStatusEffect(boss_state, ability.value.debuff); log.push({ type: 'DEBUFF_APPLIED', effect: ability.value.debuff, target: 'boss' }); }
      if (ability.value.status) { applyStatusEffect(boss_state, ability.value.status); log.push({ type: 'STATUS_APPLIED', effect: ability.value.status, target: 'boss' }); }
    }

    if (ability.effect_type === 'BUFF') {
      applyStatusEffect(char, ability.value);
      log.push({ type: 'BUFF_APPLIED', char_name: char.name, ability_name: ability.name, effect: ability.value });
    }
    if (ability.effect_type === 'DEBUFF') {
      applyStatusEffect(boss_state, ability.value);
      log.push({ type: 'DEBUFF_APPLIED', char_name: char.name, ability_name: ability.name, effect: ability.value, target: 'boss' });
    }
    if (ability.effect_type === 'HEAL') {
      const heal_amount = ability.value.heal_amount;
      if (ability.target === 'ALL_ALLIES') {
        for (const c of player_state.characters) c.hp = Math.min(c.hp_max, c.hp + heal_amount);
        log.push({ type: 'HEAL', char_name: char.name, ability_name: ability.name, heal: heal_amount, target: 'all' });
      } else {
        char.hp = Math.min(char.hp_max, char.hp + heal_amount);
        log.push({ type: 'HEAL', char_name: char.name, ability_name: ability.name, heal: heal_amount, target: char.name });
      }
      if (ability.value.status) { applyStatusEffect(char, ability.value.status); }
    }
  }

  return { log, player_state, boss_state };
}

// ── RESOLVE BOSS ACTION ───────────────────────────────────────────────────────
export function resolveBossAction({ boss_def, boss_state, all_player_states }) {
  const log = [];

  const phase = boss_def.phases.findLast(p => (boss_state.hp / boss_def.hp_max) <= p.hp_threshold) || boss_def.phases[0];
  const atk_pattern = phase.normal_attack;
  const total_party_atk = boss_state.atk_up_mod || 1.0;

  for (const ps of all_player_states) {
    for (const char of ps.characters) {
      if (char.hp <= 0) continue;
      for (let h = 0; h < (atk_pattern.hits || 1); h++) {
        const raw          = boss_def.base_atk * total_party_atk * (atk_pattern.dmg_multiplier || 1.0);
        const guard_mult   = ps.guarding ? 0.5 : 1.0;
        const shield       = char.shield || 0;
        let dmg = Math.max(0, Math.floor(raw * guard_mult));
        if (shield > 0) {
          const absorbed = Math.min(shield, dmg);
          char.shield    = shield - absorbed;
          dmg           -= absorbed;
        }
        char.hp = Math.max(0, char.hp - dmg);
        log.push({ type: 'BOSS_ATTACK', target_char: char.name, damage: dmg });
        if (atk_pattern.effect) { applyStatusEffect(char, atk_pattern.effect); log.push({ type: 'STATUS_APPLIED', effect: atk_pattern.effect, target: char.name }); }
      }
    }
    ps.guarding = false;
  }

  boss_state.charge_bar = (boss_state.charge_bar || 0) + boss_def.charge_gain_per_turn;
  if (boss_state.charge_bar >= 100) {
    boss_state.charge_bar = 0;
    const ca = phase.charge_attack;
    log.push({ type: 'BOSS_CHARGE_ATTACK', ca_name: ca.name, description: `${boss_def.name} unleashes ${ca.name}!` });
    for (const ps of all_player_states) {
      for (const char of ps.characters) {
        if (char.hp <= 0) continue;
        const dmg = Math.floor(boss_def.base_atk * (ca.dmg_multiplier || 3.0));
        char.hp = Math.max(0, char.hp - dmg);
        log.push({ type: 'BOSS_CA_HIT', target: char.name, damage: dmg });
      }
      if (ca.effect) applyStatusEffect(ps, ca.effect);
    }
  }

  const hp_pct = boss_state.hp / boss_def.hp_max;
  for (const trigger of (boss_def.triggers || [])) {
    if (!trigger.fired && hp_pct <= trigger.hp_pct) {
      trigger.fired = true;
      log.push({ type: 'TRIGGER', name: trigger.name, description: trigger.description });
      if (trigger.action.type === 'BUFF_SELF') {
        boss_state.atk_up_mod = (boss_state.atk_up_mod || 1.0) + trigger.action.amount;
      }
      if (trigger.action.type === 'DEBUFF') {
        for (const ps of all_player_states)
          for (const char of ps.characters)
            applyStatusEffect(char, { type: trigger.action.stat + '_DOWN', amount: trigger.action.amount, duration: trigger.action.duration });
      }
    }
  }

  return { log, boss_state, all_player_states };
}

// ── TICK ALL STATUS EFFECTS (end of turn) ─────────────────────────────────────
export function tickAllEffects(player_states, boss_state) {
  const log = [];
  for (const ps of player_states) {
    for (const char of ps.characters) {
      log.push(...tickStatusEffects(char));
      if (char.ability_cooldowns) {
        for (const key of Object.keys(char.ability_cooldowns))
          if (char.ability_cooldowns[key] > 0) char.ability_cooldowns[key]--;
      }
    }
  }
  log.push(...tickStatusEffects(boss_state));
  return log;
}

// ── CHECK PHASE TRANSITION ────────────────────────────────────────────────────
export function checkPhaseTransition(boss_def, boss_state) {
  const hp_pct = boss_state.hp / boss_def.hp_max;
  let new_phase_idx = 0;
  for (let i = boss_def.phases.length - 1; i >= 0; i--) {
    if (hp_pct <= boss_def.phases[i].hp_threshold) { new_phase_idx = i; break; }
  }
  if (new_phase_idx !== boss_state.current_phase_idx) {
    boss_state.current_phase_idx = new_phase_idx;
    return boss_def.phases[new_phase_idx];
  }
  return null;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getBuffAmount(entity, stat, direction) {
  const effects = entity.status_effects || [];
  const type = stat + (direction === 'up' ? '_UP' : '_DOWN');
  const eff = effects.find(e => e.type === type || e.stat === stat);
  if (!eff) return 0;
  return direction === 'up' ? (eff.amount || 0) : Math.abs(eff.amount || 0);
}

function getDebuffAmount(entity, stat) {
  const effects = entity.status_effects || [];
  const eff = effects.find(e => (e.type === stat + '_DOWN' || (e.stat === stat && e.amount < 0)));
  if (!eff) return 0;
  return eff.amount; // negative value
}