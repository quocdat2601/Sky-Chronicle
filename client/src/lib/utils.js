import { SKILL_TYPES, ELEMENT_PREFIXES } from './server/data/constants.js';

export function getFullSkillDescription(skill, element) {
  const typeDef = SKILL_TYPES[skill.skill_type];
  const elemName = element.toLowerCase();
  
  // Lấy nhãn Tier (Small, Medium...) từ weapons.js hoặc constants.js
  const tierLabel = skill.tier ? (skill.tier.charAt(0).toUpperCase() + skill.tier.slice(1)) : "Big";
  
  // Tạo câu mô tả động
  // Ví dụ: "Small boost to earth allies' ATK and max HP"
  return `${tierLabel} boost to ${elemName} allies' ${typeDef.label.replace('Omega ', '').replace('EX ', '')}`;
}