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
// ==========================================================================

export const ASSETS = {
  sfx: {
    correct: require('../../assets/sfx/correct_002.mp3'),
    wrong:   require('../../assets/sfx/wrong_001.mp3'),
    win:     require('../../assets/sfx/win_001.mp3'),
    lose:    require('../../assets/sfx/lose_001.mp3'),
  },

  tabs: {
    home: '🏡',
    gameshow: '🎮',
    leaderboard: '🏆',
    stats: '📈',
    matchHistory: '📜',
    profile: '😊',
  },

  home: {
    greetMorning: '☀️',
    greetNoon: '🌤️',
    greetNight: '🌙',
    points: '🏆',
    score: '⭐',
    streak: '🔥',
    target: '🎯',
    bolt: '⚡',
    win: '🏅',
    lose: '💔',
    draw: '🤝',
    navRank: '🏆',
    navStats: '📈',
    navProfile: '😊',
    tip: '💡',
  },

  leaderboard: {
    trophy: '🏆',
    crown: '👑',
  },

  login: {
    mascot: '✏️',
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: '⚠️',
  },

  register: {
    mascot: '🌟',
    success: '🎉',
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: '⚠️',
  },

  forgotPassword: {
    lock: '🔐',
    sent: '📬',
    warn: '⚠️',
  },

  resetPassword: {
    done: '🎉',
    key: '🔑',
    eyeShow: '👁️',
    eyeHide: '🙈',
    warn: '⚠️',
  },

  statistics: {
    title: '📈',
    matches: '🎮',
    wins: '🥇',
    winRate: '📈',
    score: '⭐',
    streakNow: '🔥',
    streakBest: '⚡',
    avgScore: '🔢',
    accuracy: '🎯',
    avgTime: '⏱️',
    achStart: '🌟',
    achHot: '🔥',
    achLucky: '🏅',
    achDiamond: '💎',
  },

  profile: {
    champion: '🏆',
    streak5: '🔥',
    speed: '⚡',
    sniper: '🎯',
    edit: '✏️',
    help: '💬',
    terms: '📋',
    logout: '🚪',
  },

  matchHistory: {
    win: '🏆',
    lose: '💪',
    draw: '🤝',
    title: '📜',
    empty: '🗒️',
  },

  levelBadge: {
    crown: '👑',
    sun: '☀️',
    moon: '🌙',
    star: '⭐',
    egg: '🥚',
    target: '🎯',
  },

  playerCard: {
    crown: '👑',
  },

  opponentInfo: {
    matches: '🎮',
    wins: '🥇',
    winRate: '📈',
    score: '⭐',
    streakNow: '🔥',
    streakBest: '⚡',
    accuracy: '🎯',
    ranking: '🏆',
    locked: '🔒',
  },

  editProfile: {
    camera: '📷',
  },

  gameResults: {
    win: '🏆',
    lose: '🚩',
    draw: '🤝',
    accuracy: '🎯',
    time: '⏱️',
    points: '🔥',
    playAgain: '⚔️',
    history: '📜',
    youAvatar: '🐱',
    oppAvatar: '🐻',
    clash: '⚡',      // tug-of-war bar clash point
    sparkle: '✦',     // starry background decor
    sparkleAlt: '✧',
    crown: '👑',      // winner's avatar crown
  },

  gameshow: {
    pkTitle: '⚔️',
    history: '📜',
    youAvatar: '🐱',
    oppAvatar: '🐻',
    rocket: '🚀',
    oppDone: '⚡',
    youFinished: '✅',
    oppLeft: '🏃',
    chat: '💬',
  },
} as const;
