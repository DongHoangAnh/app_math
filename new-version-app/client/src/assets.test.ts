import { ASSETS } from './assets';

describe('ASSETS registry', () => {
  it('exposes all four gameplay sounds', () => {
    expect(ASSETS.sfx.correct).toBeDefined();
    expect(ASSETS.sfx.wrong).toBeDefined();
    expect(ASSETS.sfx.win).toBeDefined();
    expect(ASSETS.sfx.lose).toBeDefined();
  });

  it('exposes every screen group', () => {
    const groups = [
      'sfx', 'tabs', 'home', 'leaderboard', 'login', 'register',
      'forgotPassword', 'resetPassword', 'statistics', 'profile',
      'matchHistory', 'levelBadge', 'playerCard', 'opponentInfo',
      'editProfile', 'gameResults', 'gameshow',
    ];
    for (const g of groups) {
      expect(ASSETS).toHaveProperty(g);
    }
  });

  it('keeps representative emoji values stable', () => {
    expect(ASSETS.tabs.home).toBe('🏡');
    expect(ASSETS.home.streak).toBe('🔥');
    expect(ASSETS.gameshow.youAvatar).toBe('🐱');
    expect(ASSETS.gameResults.playAgain).toBe('⚔️');
  });
});
