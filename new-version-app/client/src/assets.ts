// ==========================================================================
// MathUp — Asset Registry
// ONE place for every emoji "icon" + sound file used by the app.
// Organized BY SCREEN. Usage sites import { ASSETS } and reference
// ASSETS.<screen>.<name>. To change an icon/sound app-wide, edit it here.
//
// Screen → asset map (keep in sync when adding/removing keys):
//   sfx           : correct, wrong, win, lose            (services/feedback.ts)
//   tabs          : bottom tab-bar icons                 (App.tsx)
//   home          : HomeScreen.tsx
//   leaderboard   : LeaderboardScreen.tsx
//   login         : LoginScreen.tsx
//   register      : RegisterScreen.tsx
//   forgotPassword: ForgotPasswordScreen.tsx
//   resetPassword : ResetPasswordScreen.tsx
//   statistics    : StatisticsScreen.tsx
//   profile       : ProfileScreen.tsx
//   matchHistory  : MatchHistoryScreen.tsx
//   levelBadge    : components/LevelBadge.tsx
//   playerCard    : components/PlayerCard.tsx
//   opponentInfo  : components/OpponentInfoModal.tsx
//   editProfile   : components/EditProfileModal.tsx
//   gameResults   : components/GameResults.tsx
//   gameshow      : screens/GameShow/*.tsx
//   practice      : screens/Practice/*.tsx + PracticeStatsScreen.tsx
// ==========================================================================

export const ASSETS = {
  sfx: {
    correct: require('../../assets/sfx/correct_002.mp3'),
    wrong:   require('../../assets/sfx/wrong_001.mp3'),
    win:     require('../../assets/sfx/win_001.mp3'),
    lose:    require('../../assets/sfx/lose_001.mp3'),
  },

  tabs: {
    home: require('../../assets/tab/home.png'),
    gameshow: require('../../assets/tab/gameshow.png'),
    leaderboard: require('../../assets/tab/leaderboard.png'),
    stats: require('../../assets/tab/stats.png'),
    matchHistory: require('../../assets/tab/matchHistory.png'),
    profile: require('../../assets/tab/profile.png'),
  },

  home: {
    greetMorning: require('../../assets/home/Sun.png'),
    greetNoon: require('../../assets/home/Sun.png'),
    greetNight: require('../../assets/home/moon.png'),
    points: require('../../assets/tab/leaderboard.png'),
    score: require('../../assets/home/star.png'),
    streak: require('../../assets/home/streak.png'),
    target: require('../../assets/home/target.png'),
    bolt: require('../../assets/home/bolt.png'),
    win: require('../../assets/home/win.png'),
    lose: require('../../assets/home/lose.png'),
    draw: require('../../assets/home/draw.png'),
    navRank: require('../../assets/tab/leaderboard.png'),
    navStats: require('../../assets/tab/stats.png'),
    navProfile: require('../../assets/tab/profile.png'),
    navHistory: require('../../assets/tab/matchHistory.png'),
    pk: require('../../assets/home/pk.png'),
    heroYou: '🐱',
    heroOpp: require('../../assets/home/question.png'),
    tip: '💡',
  },

  leaderboard: {
    trophy: require('../../assets/tab/leaderboard.png'),
    crown: require('../../assets/leaderboard/crown.png'),
    battle: require('../../assets/home/pk.png'),
    clock: require('../../assets/leaderboard/clock.png'),
  },

  login: {
    mascot: require('../../assets/mathup_favicon.png'),
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: require('../../assets/login/warn.png'),
  },

  register: {
    mascot: require('../../assets/mathup_favicon.png'),
    success: '🎉',
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: require('../../assets/login/warn.png'),
  },

  forgotPassword: {
    lock: require('../../assets/login/lock.png'),
    sent: '',
    warn: require('../../assets/login/warn.png'),
  },

  resetPassword: {
    done: '',
    key: require('../../assets/login/key.png'),
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: require('../../assets/login/warn.png'),
  },

  statistics: {
    title: require('../../assets/tab/stats.png'),
    matches: require('../../assets/tab/gameshow.png'),
    wins: require('../../assets/home/win.png'),
    winRate: require('../../assets/tab/stats.png'),
    score: require('../../assets/leaderboard/star.png'),
    streakNow: require('../../assets/home/streak.png'),
    streakBest: require('../../assets/home/bolt.png'),
    avgScore: '🔢',
    accuracy: require('../../assets/home/target.png'),
    avgTime: require('../../assets/leaderboard/clock.png'),
    achStart: '🌟',
    achHot: require('../../assets/home/streak.png'),
    achLucky: require('../../assets/home/win.png'),
    achDiamond: require('../../assets/leaderboard/diamond.png'),
  },

  profile: {
    champion: require('../../assets/tab/leaderboard.png'),
    streak5: require('../../assets/home/streak.png'),
    speed: require('../../assets/home/bolt.png'),
    sniper: require('../../assets/home/target.png'),
    edit: require('../../assets/profile/edit.png'),
    help: require('../../assets/profile/help.png'),
    terms: require('../../assets/profile/term.png'),
    logout: require('../../assets/profile/logout.png'),
  },

  matchHistory: {
    win: require('../../assets/home/win.png'),
    lose: require('../../assets/home/lose.png'),
    draw: require('../../assets/home/draw.png'),
    title: require('../../assets/tab/matchHistory.png'),
    empty: require('../../assets/profile/term.png'),
  },

  levelBadge: {
    crown: require('../../assets/leaderboard/crown.png'),
    sun: require('../../assets/home/Sun.png'),
    moon: require('../../assets/home/Sun.png'),
    star: require('../../assets/leaderboard/star.png'),
    egg: require('../../assets/profile/egg.png'),
    target: require('../../assets/home/target.png'),
  },

  playerCard: {
    crown: require('../../assets/leaderboard/crown.png'),
  },

  opponentInfo: {
    matches: require('../../assets/tab/gameshow.png'),
    wins: require('../../assets/home/win.png'),
    winRate: require('../../assets/tab/stats.png'),
    score: require('../../assets/leaderboard/star.png'),
    streakNow: require('../../assets/home/streak.png'),
    streakBest: require('../../assets/home/bolt.png'),
    accuracy: require('../../assets/home/target.png'),
    ranking: require('../../assets/leaderboard/crown.png'),
    locked: require('../../assets/login/lock.png'),
  },

  editProfile: {
    camera: require('../../assets/profile/camera.png'),
  },

  gameResults: {
    win: require('../../assets/home/win.png'),
    lose: require('../../assets/home/lose.png'),
    draw: require('../../assets/home/draw.png'),
    accuracy: require('../../assets/home/target.png'),
    time: require('../../assets/leaderboard/clock.png'),
    points: require('../../assets/home/streak.png'),
    playAgain:  require('../../assets/leaderboard/battle.png'),
    history: require('../../assets/tab/matchHistory.png'),
    youAvatar: '🐱',
    oppAvatar: '🐻',
    clash: require('../../assets/home/bolt.png'),
    sparkle: '✦',     // starry background decor
    sparkleAlt: '✧',
    crown: require('../../assets/leaderboard/crown.png'),
  },

  gameshow: {
    pkTitle: require('../../assets/leaderboard/battle.png'),
    history: require('../../assets/tab/matchHistory.png'),
    youAvatar: '🐱',
    oppAvatar: '🐻',
    rocket:  require('../../assets/gameshow/rocket.png'),
    oppDone:  require('../../assets/home/bolt.png'),
    youFinished: require('../../assets/gameshow/finished.png'),
    oppLeft: require('../../assets/profile/logout.png'),
    chat: require('../../assets/profile/help.png'),
  },

  practice: {
    title: require('../../assets/home/target.png'),
    classic: require('../../assets/practice/classic.png'),
    endless:require('../../assets/practice/loop.png'),
    speed: require('../../assets/home/bolt.png'),
    weakspot: require('../../assets/practice/weakspot.png'),
    custom: require('../../assets/practice/setting_custom.png'),
    levelUp: require('../../assets/practice/level_up.png'),
    levelDown: require('../../assets/practice/level_down.png'),
    timer: require('../../assets/leaderboard/clock.png'),
    correct: require('../../assets/practice/correct.png'),
    history: require('../../assets/tab/matchHistory.png'),
    empty: require('../../assets/profile/term.png'),
  },
} as const;
