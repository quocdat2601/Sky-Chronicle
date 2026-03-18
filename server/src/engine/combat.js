// ─────────────────────────────────────────────────────────────────────────────
// COMBAT ENGINE  — Server-side authoritative game logic
// ─────────────────────────────────────────────────────────────────────────────
import { ELEMENT_ADVANTAGE } from '../data/catalog.js';

const DAMAGE_CAP = 999999;

// ── ELEMENT MODIFIER ──────────────────────────────────────────────────────────
export function getElementModifier(attackerElement, defenderElement) {
  const adv = ELEMENT_ADVANTAGE[attackerElement];
  if (!adv) return 1.0;
  if (adv.strong === defenderElement) return 1.5;
  if (adv.weak  === defenderElement) return 0.75;
  return 1.0;
}

// ── WEAPON SKILL MAGNITUDE ────────────────────────────────────────────────────
export function calcSkillMagnitude(skill) {
  return skill.magnitude_base + (skill.skill_level - 1) * skill.magnitude_per_level;
}

// ── GRID STATS ────────────────────────────────────────────────────────────────
export function calcGridStats(weapons /* Weapon[] */) {
  let normal_sum = 0, omega_sum = 0, ex_sum = 0;
  let crit_sum = 0, charge_speed_sum = 0;
  let grid_atk = 0, grid_hp = 0;

  for (const w of weapons) {
    if (!w) continue;
    grid_atk += w.base_atk;
    grid_hp  += w.base_hp;
    for (const skill of (w.skills || [])) {
      const mag = calcSkillMagnitude(skill);
      switch (skill.skill_type) {
        case 'ATK_NORMAL':    normal_sum  += mag; break;
        case 'ATK_OMEGA':     omega_sum   += mag; break;
        case 'ATK_EX':        ex_sum      += mag; break;
        case 'CRITICAL_RATE': crit_sum    += mag; break;
        case 'CHARGE_SPEED':  charge_speed_sum += mag; break;
        // HP_BOOST, STAMINA, ENMITY handled at runtime
      }
    }
  }

  return {
    grid_atk,
    grid_hp,
    normal_mult: 1 + normal_sum,
    omega_mult:  1 + omega_sum,
    ex_mult:     1 + ex_sum,
    crit_rate:   Math.min(crit_sum, 0.5),   // cap at 50%
    charge_speed_bonus: charge_speed_sum,
  };
}

// ── GET STAMINA/ENMITY MODIFIER ───────────────────────────────────────────────
function getStaminaEnmityMod(weapons, char_hp, char_hp_max) {
  let bonus = 0;
  for (const w of weapons) {
    if (!w) continue;
    for (const skill of (w.skills || [])) {
      const mag = calcSkillMagnitude(skill);
      if (skill.skill_type === 'STAMINA') {
        const hp_pct = char_hp / char_hp_max;
        bonus += mag * hp_pct; // full bonus at full HP
      }
      if (skill.skill_type === 'ENMITY') {
        const hp_pct = 1 - (char_hp / char_hp_max);
        bonus += mag * hp_pct; // full bonus at 1 HP
      }
    }
  }
  return bonus; // added into normal_mult
}

// ── DAMAGE FORMULA ────────────────────────────────────────────────────────────
export function calcDamage({
  attacker,       // { base_atk, element, hp, hp_max }
  gridStats,      // from calcGridStats
  weapons,        // raw weapons array for stamina/enmity
  defender,       // { def, element }
  dmg_multiplier, // ability or CA multiplier
  is_ca = false,
}) {
  const { normal_mult, omega_mult, ex_mult, crit_rate } = gridStats;

  // ATK buffs from status effects on attacker
  const atk_buff_mult = 1 + (attacker.atk_up || 0) - (attacker.atk_down || 0);

  const stam_enmity = getStaminaEnmityMod(weapons, attacker.hp, attacker.hp_max);
  const eff_normal = 1 + (normal_mult - 1 + stam_enmity);

  const element_mod  = getElementModifier(attacker.element, defender.element);
  const crit_roll    = Math.random() < crit_rate;
  const crit_mod     = crit_roll ? 1.5 : 1.0;

  // DEF debuff from defender
  const eff_def = Math.max(0, defender.def * (1 + (defender.def_down || 0)));

  const base_atk = (attacker.base_atk + gridStats.grid_atk) * atk_buff_mult;

  const raw = base_atk
    * eff_normal
    * omega_mult
    * ex_mult
    * element_mod
    * crit_mod
    * dmg_multiplier
    - eff_def;

  return {
    damage: Math.min(Math.max(0, Math.floor(raw)), DAMAGE_CAP),
    is_crit: crit_roll,
    element_mod,
  };
}

// ── APPLY STATUS EFFECT ───────────────────────────────────────────────────────
export function applyStatusEffect(target_state, effect) {
  if (!target_state.status_effects) target_state.status_effects = [];

  // Remove existing same-type effect (no stacking same type in MVP)
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

  // Apply DOT
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

  // Decrement duration
  combatant_state.status_effects = combatant_state.status_effects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0);

  return log;
}

// ── CHARGE BAR UPDATE ─────────────────────────────────────────────────────────
export function updateChargeBar(char_state, base_gain, charge_speed_bonus) {
  const slow = char_state.status_effects?.find(e => e.type === 'SLOW')?.amount || 0;
  const haste = char_state.status_effects?.find(e => e.stat === 'CHARGE')?.amount || 0;
  const eff_gain = base_gain * (1 + charge_speed_bonus + haste + slow);
  char_state.charge_bar = Math.min(100, char_state.charge_bar + Math.floor(eff_gain));
  return char_state.charge_bar >= 100;
}

// ── RESOLVE PLAYER TURN ───────────────────────────────────────────────────────
/**
 * Returns { turn_log, state_after } where state_after has updated hp/bars.
 * This is the core server-authoritative resolver.
 */
export function resolvePlayerAction({ action, player_state, boss_state, grid_stats, weapons }) {
  const log = [];

  if (action.type === 'GUARD') {
    player_state.guarding = true;
    log.push({ type: 'GUARD', player_id: player_state.player_id });
    return { log, player_state, boss_state };
  }

  // Normal Attack — each alive character attacks once
  if (action.type === 'ATTACK' || action.type === 'AUTO') {
    const ca_triggered = [];

    for (const char of player_state.characters) {
      if (char.hp <= 0) continue;

      // Normal hit
      const result = calcDamage({
        attacker: { ...char, base_atk: char.base_atk, element: char.element, hp: char.hp, hp_max: char.hp_max, atk_up: getBuffAmount(char, 'ATK', 'up'), atk_down: getBuffAmount(char, 'ATK', 'down') },
        gridStats: grid_stats,
        weapons,
        defender: { def: boss_state.def, element: boss_state.element, def_down: getDebuffAmount(boss_state, 'DEF') },
        dmg_multiplier: 1.0,
      });
      boss_state.hp = Math.max(0, boss_state.hp - result.damage);
      log.push({ type: 'NORMAL_ATTACK', char_id: char.id, char_name: char.name, damage: result.damage, is_crit: result.is_crit });

      // Charge gain
      const ca_ready = updateChargeBar(char, char.charge_gain_per_turn, grid_stats.charge_speed_bonus);
      if (ca_ready) ca_triggered.push(char);
    }

    // Resolve Charge Attacks
    const ca_damages = [];
    for (const char of ca_triggered) {
      const ca_def = char.charge_attack;
      const ca_result = calcDamage({
        attacker: { ...char, base_atk: char.base_atk, element: char.element, hp: char.hp, hp_max: char.hp_max },
        gridStats: grid_stats,
        weapons,
        defender: { def: boss_state.def, element: boss_state.element, def_down: getDebuffAmount(boss_state, 'DEF') },
        dmg_multiplier: ca_def.value.dmg_multiplier,
        is_ca: true,
      });
      boss_state.hp = Math.max(0, boss_state.hp - ca_result.damage);
      char.charge_bar = 0;
      ca_damages.push({ char_id: char.id, char_name: char.name, damage: ca_result.damage });
      log.push({ type: 'CHARGE_ATTACK', char_id: char.id, char_name: char.name, ca_name: ca_def.name, damage: ca_result.damage });

      // CA buff effects
      if (ca_def.value.buff) {
        applyStatusEffect(player_state, { ...ca_def.value.buff, type: ca_def.value.buff.stat + '_UP', target_id: 'party' });
      }
    }

    // Chain Burst
    if (ca_triggered.length >= 2) {
      const chain_count = Math.min(ca_triggered.length, 4);
      const bonuses = { 2: 0.25, 3: 0.50, 4: 1.00 };
      const bonus_pct = bonuses[chain_count] || 0;
      const total_ca_dmg = ca_damages.reduce((s, c) => s + c.damage, 0);
      const cb_bonus = Math.floor(total_ca_dmg * bonus_pct);
      boss_state.hp = Math.max(0, boss_state.hp - cb_bonus);
      log.push({ type: 'CHAIN_BURST', chain_count, bonus_pct, cb_bonus, participants: ca_triggered.map(c => c.name) });
    }
  }

  // Use Ability
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

    // Set cooldown
    if (!char.ability_cooldowns) char.ability_cooldowns = {};
    char.ability_cooldowns[ability.id] = ability.cooldown_max;

    if (ability.effect_type === 'DAMAGE') {
      const result = calcDamage({
        attacker: { ...char, element: char.element, hp: char.hp, hp_max: char.hp_max },
        gridStats: grid_stats, weapons,
        defender: { def: boss_state.def, element: boss_state.element, def_down: getDebuffAmount(boss_state, 'DEF') },
        dmg_multiplier: ability.value.dmg_multiplier,
      });
      boss_state.hp = Math.max(0, boss_state.hp - result.damage);
      log.push({ type: 'ABILITY', char_name: char.name, ability_name: ability.name, damage: result.damage });

      if (ability.value.debuff) {
        applyStatusEffect(boss_state, ability.value.debuff);
        log.push({ type: 'DEBUFF_APPLIED', effect: ability.value.debuff, target: 'boss' });
      }
      if (ability.value.status) {
        applyStatusEffect(boss_state, ability.value.status);
        log.push({ type: 'STATUS_APPLIED', effect: ability.value.status, target: 'boss' });
      }
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
        for (const c of player_state.characters) {
          c.hp = Math.min(c.hp_max, c.hp + heal_amount);
        }
        log.push({ type: 'HEAL', char_name: char.name, ability_name: ability.name, heal: heal_amount, target: 'all' });
      } else {
        // Heal self or first ally for now
        char.hp = Math.min(char.hp_max, char.hp + heal_amount);
        log.push({ type: 'HEAL', char_name: char.name, ability_name: ability.name, heal: heal_amount, target: char.name });
      }
    }
  }

  return { log, player_state, boss_state };
}

// ── RESOLVE BOSS ACTION ───────────────────────────────────────────────────────
export function resolveBossAction({ boss_def, boss_state, all_player_states }) {
  const log = [];

  // Pick boss current phase
  const phase = boss_def.phases.findLast(p => (boss_state.hp / boss_def.hp_max) <= p.hp_threshold) || boss_def.phases[0];
  const atk_pattern = phase.normal_attack;

  let total_party_atk = boss_state.atk_up_mod || 1.0;

  for (const ps of all_player_states) {
    for (const char of ps.characters) {
      if (char.hp <= 0) continue;

      for (let h = 0; h < (atk_pattern.hits || 1); h++) {
        const raw = boss_def.base_atk * total_party_atk * (atk_pattern.dmg_multiplier || 1.0);
        const shield = char.shield || 0;
        const guard_reduction = ps.guarding ? 0.5 : 1.0;
        let dmg = Math.max(0, Math.floor(raw * guard_reduction) - shield);

        if (shield > 0) {
          const absorbed = Math.min(shield, dmg);
          char.shield = shield - absorbed;
          dmg -= absorbed;
        }

        char.hp = Math.max(0, char.hp - dmg);
        log.push({ type: 'BOSS_ATTACK', target_char: char.name, damage: dmg });

        if (atk_pattern.effect) {
          applyStatusEffect(char, atk_pattern.effect);
          log.push({ type: 'STATUS_APPLIED', effect: atk_pattern.effect, target: char.name });
        }
      }
    }
    ps.guarding = false;
  }

  // Boss charge bar
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

  // Check HP triggers
  const hp_pct = boss_state.hp / boss_def.hp_max;
  for (const trigger of (boss_def.triggers || [])) {
    if (!trigger.fired && hp_pct <= trigger.hp_pct) {
      trigger.fired = true;
      log.push({ type: 'TRIGGER', name: trigger.name, description: trigger.description });
      if (trigger.action.type === 'BUFF_SELF') {
        boss_state.atk_up_mod = (boss_state.atk_up_mod || 1.0) + trigger.action.amount;
      }
      if (trigger.action.type === 'DEBUFF') {
        for (const ps of all_player_states) {
          for (const char of ps.characters) {
            applyStatusEffect(char, { type: trigger.action.stat + '_DOWN', amount: trigger.action.amount, duration: trigger.action.duration });
          }
        }
      }
    }
  }

  return { log, boss_state, all_player_states };
}

// ── TICK ALL STATUS EFFECTS (end of turn) ────────────────────────────────────
export function tickAllEffects(player_states, boss_state) {
  const log = [];
  for (const ps of player_states) {
    for (const char of ps.characters) {
      const char_log = tickStatusEffects(char);
      log.push(...char_log);
      // Decrement ability cooldowns
      if (char.ability_cooldowns) {
        for (const key of Object.keys(char.ability_cooldowns)) {
          if (char.ability_cooldowns[key] > 0) char.ability_cooldowns[key]--;
        }
      }
    }
  }
  const boss_log = tickStatusEffects(boss_state);
  log.push(...boss_log);
  return log;
}

// ── CHECK PHASE TRANSITION ────────────────────────────────────────────────────
export function checkPhaseTransition(boss_def, boss_state) {
  const hp_pct = boss_state.hp / boss_def.hp_max;
  let new_phase_idx = 0;
  for (let i = boss_def.phases.length - 1; i >= 0; i--) {
    if (hp_pct <= boss_def.phases[i].hp_threshold) {
      new_phase_idx = i;
      break;
    }
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
