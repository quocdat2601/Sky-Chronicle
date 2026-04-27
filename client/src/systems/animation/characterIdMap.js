export const GBF_NPC_ID_BY_CHAR_ID = {
  C001: '3040028000',
  C002: '3040110000',
  C003: '3040213000',
};

export function getGbfNpcId(charId) {
  return GBF_NPC_ID_BY_CHAR_ID[charId] || null;
}

