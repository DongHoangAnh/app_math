// ================================================================
// QQ-style level system
//
// Visual tiers (identical to QQ's star/moon/sun/crown icons):
//   4 stars → 1 moon  |  4 moons → 1 sun  |  4 suns → 1 crown
//
// EXP thresholds per level:
//   Star tier  (level 1-4):  200 EXP each
//   Moon tier  (level 5-16): 400 EXP each
//   Sun tier  (level 17-64): 1000 EXP each
//   Crown tier (level 65+):  2500 EXP each
// ================================================================

export type LevelIcons = {
  crowns: number;
  suns: number;
  moons: number;
  stars: number;
};

export type TierName = 'newcomer' | 'soldier' | 'hero' | 'legend';

/** Decompose a level number into QQ-style icon counts (1-indexed level). */
export function getLevelIcons(level: number): LevelIcons {
  const adj = Math.max(0, level - 1);
  const crowns = Math.floor(adj / 64);
  const rem1 = adj % 64;
  const suns = Math.floor(rem1 / 16);
  const rem2 = rem1 % 16;
  const moons = Math.floor(rem2 / 4);
  const stars = rem2 % 4;
  return { crowns, suns, moons, stars };
}

/** Tier classification for a level. */
export function getTier(level: number): TierName {
  if (level >= 65) return 'legend';
  if (level >= 17) return 'hero';
  if (level >= 5) return 'soldier';
  return 'newcomer';
}

export const TIER_LABEL: Record<TierName, string> = {
  newcomer: 'Tân Thủ',
  soldier:  'Chiến Sĩ',
  hero:     'Anh Hùng',
  legend:   'Huyền Thoại',
};

export const TIER_COLOR: Record<TierName, string> = {
  newcomer: '#F9A825',
  soldier:  '#1976D2',
  hero:     '#E65100',
  legend:   '#6A1B9A',
};

/** EXP needed to advance from `level` to `level + 1`. */
export function getExpForNextLevel(level: number): number {
  if (level <= 4) return 200;
  if (level <= 16) return 400;
  if (level <= 64) return 1000;
  return 2500;
}

/** Cumulative EXP required to start a given level (i.e., total EXP to reach that level). */
export function getCumulativeExpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 5) return (level - 1) * 200;
  if (level <= 17) return 800 + (level - 5) * 400;
  if (level <= 65) return 5600 + (level - 17) * 1000;
  return 53600 + (level - 65) * 2500;
}

/** Calculate level from total accumulated EXP. Mirrors the SQL formula in migration 002. */
export function getLevelFromExp(exp: number): number {
  if (exp < 800) return Math.floor(exp / 200) + 1;
  if (exp < 5600) return 4 + Math.floor((exp - 800) / 400) + 1;
  if (exp < 53600) return 16 + Math.floor((exp - 5600) / 1000) + 1;
  return 64 + Math.floor((exp - 53600) / 2500) + 1;
}

/** Progress within the current level: expInLevel, expForNext, percent 0-100. */
export function getLevelProgress(totalExp: number): {
  level: number;
  expInLevel: number;
  expForNext: number;
  percent: number;
} {
  const level = getLevelFromExp(totalExp);
  const levelStart = getCumulativeExpForLevel(level);
  const expForNext = getExpForNextLevel(level);
  const expInLevel = totalExp - levelStart;
  const percent = Math.min(100, Math.round((expInLevel / expForNext) * 100));
  return { level, expInLevel, expForNext, percent };
}
