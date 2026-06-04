import {
  getLevelIcons,
  getTier,
  getExpForNextLevel,
  getCumulativeExpForLevel,
  getLevelFromExp,
  getLevelProgress,
} from '../levelUtils';

describe('getLevelFromExp', () => {
  it('maps EXP to the right level at tier boundaries', () => {
    expect(getLevelFromExp(0)).toBe(1);
    expect(getLevelFromExp(199)).toBe(1);
    expect(getLevelFromExp(200)).toBe(2);
    expect(getLevelFromExp(799)).toBe(4);
    expect(getLevelFromExp(800)).toBe(5);
    expect(getLevelFromExp(5599)).toBe(16);
    expect(getLevelFromExp(5600)).toBe(17);
    expect(getLevelFromExp(53599)).toBe(64);
    expect(getLevelFromExp(53600)).toBe(65);
  });
});

describe('getCumulativeExpForLevel ↔ getLevelFromExp are consistent', () => {
  it('cumulative EXP for a level lands exactly on that level', () => {
    for (const lvl of [1, 2, 5, 17, 65, 80]) {
      const exp = getCumulativeExpForLevel(lvl);
      expect(getLevelFromExp(exp)).toBe(lvl);
    }
  });

  it('known cumulative thresholds', () => {
    expect(getCumulativeExpForLevel(1)).toBe(0);
    expect(getCumulativeExpForLevel(5)).toBe(800);
    expect(getCumulativeExpForLevel(17)).toBe(5600);
    expect(getCumulativeExpForLevel(65)).toBe(53600);
  });
});

describe('getExpForNextLevel', () => {
  it('returns the per-tier EXP step', () => {
    expect(getExpForNextLevel(1)).toBe(200);
    expect(getExpForNextLevel(4)).toBe(200);
    expect(getExpForNextLevel(5)).toBe(400);
    expect(getExpForNextLevel(16)).toBe(400);
    expect(getExpForNextLevel(17)).toBe(1000);
    expect(getExpForNextLevel(64)).toBe(1000);
    expect(getExpForNextLevel(65)).toBe(2500);
  });
});

describe('getTier', () => {
  it('classifies levels into tiers', () => {
    expect(getTier(1)).toBe('newcomer');
    expect(getTier(4)).toBe('newcomer');
    expect(getTier(5)).toBe('soldier');
    expect(getTier(16)).toBe('soldier');
    expect(getTier(17)).toBe('hero');
    expect(getTier(64)).toBe('hero');
    expect(getTier(65)).toBe('legend');
  });
});

describe('getLevelIcons', () => {
  it('level 1 has no icons', () => {
    expect(getLevelIcons(1)).toEqual({ crowns: 0, suns: 0, moons: 0, stars: 0 });
  });

  it('4 stars roll up into 1 moon at level 5', () => {
    expect(getLevelIcons(5)).toEqual({ crowns: 0, suns: 0, moons: 1, stars: 0 });
  });

  it('decomposes a mid-tier level', () => {
    // level 18 → adj 17 → suns floor(17/16)=1, rem 1 → 0 moons, 1 star
    expect(getLevelIcons(18)).toEqual({ crowns: 0, suns: 1, moons: 0, stars: 1 });
  });

  it('crown appears at level 65', () => {
    expect(getLevelIcons(65)).toEqual({ crowns: 1, suns: 0, moons: 0, stars: 0 });
  });
});

describe('getLevelProgress', () => {
  it('reports zero progress at the start of a level', () => {
    expect(getLevelProgress(0)).toEqual({
      level: 1,
      expInLevel: 0,
      expForNext: 200,
      percent: 0,
    });
  });

  it('reports half progress midway through level 1', () => {
    expect(getLevelProgress(100)).toEqual({
      level: 1,
      expInLevel: 100,
      expForNext: 200,
      percent: 50,
    });
  });

  it('caps percent at 100', () => {
    const p = getLevelProgress(799);
    expect(p.level).toBe(4);
    expect(p.percent).toBeLessThanOrEqual(100);
  });
});
