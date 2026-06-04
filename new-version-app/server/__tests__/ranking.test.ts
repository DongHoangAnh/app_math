import {
  POINTS_WIN,
  POINTS_LOSE,
  outcomeDelta,
  computeRankingDeltas,
} from '../ranking';

describe('ranking — outcomeDelta', () => {
  it('awards POINTS_WIN for a win', () => {
    expect(outcomeDelta('win')).toBe(POINTS_WIN);
    expect(outcomeDelta('win')).toBe(5);
  });

  it('subtracts POINTS_LOSE for a loss', () => {
    expect(outcomeDelta('lose')).toBe(-POINTS_LOSE);
    expect(outcomeDelta('lose')).toBe(-3);
  });

  it('is zero for a draw', () => {
    expect(outcomeDelta('draw')).toBe(0);
  });
});

describe('ranking — computeRankingDeltas', () => {
  const P1 = 'player-1';
  const P2 = 'player-2';

  it('player1 wins → +5 / -3', () => {
    expect(computeRankingDeltas(P1, P1, P2)).toEqual({
      player1Delta: POINTS_WIN,
      player2Delta: -POINTS_LOSE,
    });
  });

  it('player2 wins → -3 / +5', () => {
    expect(computeRankingDeltas(P2, P1, P2)).toEqual({
      player1Delta: -POINTS_LOSE,
      player2Delta: POINTS_WIN,
    });
  });

  it('draw (null winner) → both zero', () => {
    expect(computeRankingDeltas(null, P1, P2)).toEqual({
      player1Delta: 0,
      player2Delta: 0,
    });
  });

  it('unknown winner id is treated as a draw', () => {
    expect(computeRankingDeltas('someone-else', P1, P2)).toEqual({
      player1Delta: 0,
      player2Delta: 0,
    });
  });

  it('the two deltas are zero-sum on a decisive result', () => {
    const { player1Delta, player2Delta } = computeRankingDeltas(P1, P1, P2);
    expect(player1Delta + player2Delta).toBe(POINTS_WIN - POINTS_LOSE);
  });
});
