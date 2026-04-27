export const GBF_ENEMY_ID_BY_BOSS_ID = {
  BOSS003: '4100663',
};

export function getGbfEnemyId(bossId) {
  return GBF_ENEMY_ID_BY_BOSS_ID[bossId] || null;
}

