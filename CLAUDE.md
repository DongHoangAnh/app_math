# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mathup-mobile** is a React Native mobile app featuring **GameShow** — a multiplayer 1v1 math competition game with real-time WebSocket gameplay, Supabase authentication (Google OAuth), and a leaderboard ranking system.

- **Type**: React Native + TypeScript (Expo managed)
- **Backend**: Node.js + WebSocket server
- **Database**: PostgreSQL (Supabase)
- **Auth**: Google OAuth via Supabase
- **Real-time**: WebSocket for live multiplayer gameplay

## Quick Commands

**Frontend (React Native):**
- `npm start` — Start Expo dev server (press `i` for iOS, `a` for Android, `w` for web)
- `npm run ios` — Run on iOS simulator
- `npm run android` — Run on Android emulator
- `npm run web` — Run web version
- `npm test` — Run tests (Jest preset: jest-expo)

**Backend:**
- `npm run server` — Start Node.js WebSocket server (runs on port 3000 by default)

**Project Root:**
- The main app code is in `new-version-app/`

## Directory Structure

```
new-version-app/
├── App.tsx                         # Root app entry point (navigation setup)
├── client/src/
│   ├── App.tsx                     # Main app component
│   ├── screens/                    # 5 navigation screens
│   │   ├── LoginScreen.tsx         # Google OAuth + email/password login
│   │   ├── RegisterScreen.tsx      # User registration
│   │   ├── HomeScreen.tsx          # Main hub with game options
│   │   ├── GameShowScreen.tsx      # 1v1 game — glue only (state/timers/routing)
│   │   ├── GameShow/               # GameShowScreen split (see "Splitting a big screen")
│   │   │   ├── styles.ts           # Shared StyleSheet for the screen
│   │   │   ├── utils.ts            # Pure helpers + FloatingEmoji type
│   │   │   ├── *Phase.tsx          # One file per match phase (Idle/Playing/…)
│   │   │   └── *.tsx               # Sub-components (ChatBar, GameKeypad, …)
│   │   ├── MatchHistoryScreen.tsx  # Past match list
│   │   ├── ProfileScreen.tsx       # User profile & settings
│   │   ├── StatisticsScreen.tsx    # Player stats & achievements
│   │   ├── LeaderboardScreen.tsx   # Global ranking leaderboard
│   │   ├── ForgotPasswordScreen.tsx # Password recovery
│   │   └── ResetPasswordScreen.tsx  # Password reset (email link)
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── ui.tsx                  # Shared primitives (TactileButton, …)
│   │   ├── GameQuestion.tsx        # Display math question + options
│   │   ├── GameResults.tsx         # Match results UI
│   │   ├── OpponentInfoModal.tsx   # Opponent profile preview (uses gameApi)
│   │   ├── PlayerCard.tsx          # Player info card (opponent preview)
│   │   ├── LevelBadge.tsx          # User level badge
│   │   ├── EditProfileModal.tsx    # Profile editor
│   │   └── Text.tsx                # Custom text component
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.tsx             # Auth state & Google OAuth logic
│   │   ├── useGameShowWS.ts        # WebSocket connection & game state
│   │   ├── useGameStats.ts         # Fetch player stats from API
│   │   └── useDailyTasks.ts        # Daily challenge tracking
│   │
│   ├── services/                   # External service clients
│   │   ├── supabase.ts             # Supabase client init (reads config.ts)
│   │   ├── api.ts                  # SINGLE REST layer: `gameApi` + DTOs + ApiError (over authFetch)
│   │   └── questionGenerator.ts    # Generate math questions
│   │
│   ├── config.ts                   # SINGLE place that reads env vars (API_URL, WS_URL, Supabase)
│   │
│   └── utils/                      # Helper utilities
│       ├── authFetch.ts            # Fetch wrapper with auth token
│       ├── levelUtils.ts           # XP → level conversion
│       └── validation.ts           # Input validation (email, password, etc.)
│
├── server/
│   ├── index.ts                    # HTTP server setup, REST API routes
│   ├── gameshow-ws.ts              # WebSocket server logic (matchmaking, game flow)
│   ├── ranking.ts                  # Pure ranking-point math (no DB) — unit-testable
│   ├── rateLimiter.ts              # Per-user chat/emoji rate limit + profanity filter
│   ├── questions.ts                # Pure question generator (normalizeMode, generateQuestions)
│   └── supabase-server.ts          # Server-side Supabase client & DB operations
│
├── shared/                         # Code shared between client + server
│   ├── types.ts                    # SINGLE source for game types (GameQuestion, GameMode, …)
│   ├── constants.ts                # SINGLE source for game constants (QUESTIONS_PER_MATCH, MODES, EMOJIS, …)
│   └── schema.ts                   # Drizzle ORM schemas (database table definitions)
│
├── docs/
│   ├── README.md                   # System overview
│   ├── GAMESHOW_API.md             # WebSocket message protocol
│   ├── AUTH_SETUP.md               # Authentication setup guide
│   └── DEPLOYMENT.md               # Deployment instructions
│
├── package.json
├── tsconfig.json
└── app.json                        # Expo app configuration
```

## Architecture & Key Patterns

### Navigation (React Navigation)
- **Stack Navigator**: Auth flow (Login → Register → ForgotPassword → ResetPassword) + MainApp
- **Tab Navigator**: Main app has 5 tabs (Home, GameShow, Leaderboard, Stats, Profile)
- Deep linking handled via `useDeepLinkHandler()` in App.tsx (for auth callbacks on native platforms)

### Authentication Flow
1. User signs in via Google OAuth (Supabase) or email/password
2. Session stored in Supabase + AuthContext + device storage
3. `useAuth()` hook provides `{ user, loading, passwordRecovery }`
4. Routes guard access based on `user` state
5. Password recovery triggered by email link → Deep link → ResetPasswordScreen

### Real-time Gameplay (WebSocket)
1. User joins queue via `useGameShowWS()` hook
2. WebSocket connects to `ws://backend:3000/ws/gameshow`
3. Messages flow: `JOIN_QUEUE` → `MATCH_FOUND` → `SUBMIT_ANSWER` → `OPPONENT_PROGRESS` → `YOU_FINISHED` / `OPPONENT_FINISHED` → `GAME_OVER`
4. Server manages rooms, validates answers, broadcasts opponent progress
5. Ranking points updated automatically on `GAME_OVER`

### API Endpoints (REST)
- `GET /api/gameshow/stats/:userId` — Fetch player leaderboard stats (public)
- `GET /api/daily-tasks/:userId` — Fetch user's daily challenges (auth required)
- `POST /api/daily-tasks/:userId/claim/:taskKey` — Claim daily task reward (auth required)
- All endpoints include security headers (CORS, XSS protection, CSRF tokens)

### State Management
- **Auth**: `useAuth()` hook (Supabase session) — the real auth lives in `hooks/useAuth.tsx`
- **Game**: `useGameShowWS()` hook (WebSocket state + room management)
- **Stats**: `useGameStats()` hook (fetched from API)
- **UI**: Local component state (forms, modals, loading)
- No Redux/Zustand — hooks are sufficient for this app size

### Code Patterns — MUST follow (don't regress these)

These conventions were established during the refactor. Breaking them re-introduces
the exact bugs/duplication they removed, so follow them for all new code:

1. **Env vars → only `client/src/config.ts`.** Never read `process.env` anywhere else.
   Expo/Metro inlines `process.env.EXPO_PUBLIC_*` at the *literal* reference site, so
   each var MUST be referenced in `config.ts` as a full static expression (never built
   from a key name). Other modules import the resolved values / `resolveWsUrl()`.
2. **Shared types → `shared/types.ts`; shared constants → `shared/constants.ts`.** One
   source of truth, imported by both client and server. Never redefine `GameQuestion`,
   `GameMode`, `MODES`, `EMOJIS`, limits, banned-word lists, etc. locally.
3. **REST calls → only `services/api.ts` (`gameApi`).** No raw `fetch`/`axios` in screens
   or hooks. `gameApi` is built on `authFetch` (attaches the Supabase bearer token) and
   throws `ApiError` with a `.status` field — branch on `e instanceof ApiError && e.status === 401`,
   not on string-matching messages. (`axios` is a leftover dep, unused — do not add new uses.)
4. **Server: keep pure logic out of the WS/DB files.** Point math lives in `ranking.ts`,
   chat limits/profanity in `rateLimiter.ts`, question generation in `questions.ts`.
   `gameshow-ws.ts` / `supabase-server.ts` import from them — don't inline that logic back.
5. **Splitting a big screen → folder pattern (see `screens/GameShow/`).** The screen file
   stays *glue only* (owns state, timers, handlers, phase routing). Extract: one shared
   `styles.ts`, pure helpers in `utils.ts`, one `*Phase.tsx` per phase, and reusable
   sub-components. Move the StyleSheet verbatim so visuals don't drift.
6. **Assets (emoji icons + sound files) → only `client/src/assets.ts` (`ASSETS`).** One
   registry, keyed *by screen* (`ASSETS.home.points`, `ASSETS.gameshow.youAvatar`,
   `ASSETS.sfx.win`, …). Screens/components/services import `{ ASSETS }` and reference a
   key — never inline an emoji literal or `require('../../assets/...')` at the use site.
   To change an icon/sound app-wide, edit the registry. Keep the header screen→asset map
   in sync when adding keys. Sound files live under `assets/sfx/` and MUST be committed
   (Metro resolves `require()` statically — uncommitted files break a clean build). Not
   centralized (leave inline): functional control glyphs (`⌫`, `✓`, `·`), directional
   arrows (`→`/`←`), emoji embedded mid-sentence, and emoji in code comments.

### Database Schema
- **users** — User profiles, auth, stats (points, level, streak, XP)
- **game_scores** — Individual match results
- **daily_tasks** — Daily challenges with rewards
- **leaderboard** — View for top 50 players (auto-updated via RPC)

## Development Notes

### TypeScript Config
- Extends `expo/tsconfig.base` for React Native compilation
- Strict mode enabled
- `jsx: "react-native"` for RN components
- Some files excluded from type-check: `protected-route.tsx`, `game-results.tsx` (legacy)

### Key Dependencies
- **react-native**: 0.81.5 (latest compatible with Expo 54)
- **@react-navigation**: Bottom-tabs + native-stack navigation
- **@supabase/supabase-js**: Auth + database client
- **ws**: WebSocket client (for game connection)
- **expo-auth-session** + **expo-web-browser**: OAuth flow support
- *(note: `axios` is still in package.json but unused in `src` — REST goes through `gameApi`/`authFetch`)*
- **react-native-vector-icons**: Icon library
- **dotenv**: Environment variable loading

### Environment Variables
Config lives in `new-version-app/.env` (gitignored — never commit it; never paste its
values into any tracked file, especially `SUPABASE_SERVICE_KEY`). The file holds both
client and server vars:

```
# Client (Expo) — bundled into the app, read via client/src/config.ts
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<supabase publishable/anon key>
EXPO_PUBLIC_API_URL=https://<backend host>          # prod: Railway deploy
EXPO_PUBLIC_WS_URL=wss://<backend host>/ws/gameshow # optional; derived from API_URL if unset

# Server only — NEVER prefix with EXPO_PUBLIC_ (must not ship to the client)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<supabase service-role secret>  # secret — keep out of git/logs
```

**Rules:**
- Prefix client vars with `EXPO_PUBLIC_` so Expo bundles them; everything else stays
  server-only. The service-role key must **never** get an `EXPO_PUBLIC_` prefix.
- Client code reads these only through `client/src/config.ts` (see Code Patterns #1).
- `EXPO_PUBLIC_WS_URL` is optional — `resolveWsUrl()` derives `wss://…/ws/gameshow`
  from `EXPO_PUBLIC_API_URL` when it's unset.
- Restart the Expo dev server after editing `.env` (vars are inlined at bundle time).

### Common Workflows

**Adding a new screen:**
1. Create `client/src/screens/MyScreen.tsx` (React Native View + functional component)
2. Add to navigation in `App.tsx` (Stack or Tab navigator)
3. Use `useNavigation()` + `useRoute()` for nav props
4. Import and use `useAuth()` + game hooks as needed

**Adding a new API endpoint:**
1. Add route handler in `server/index.ts` (match pathname, validate UUID/auth, call DB function)
2. Implement DB query in `server/supabase-server.ts`
3. Add a typed DTO + method to `gameApi` in `client/src/services/api.ts` (built on `authFetch`,
   throws `ApiError`) — do NOT call `fetch`/`axios` directly from the screen (Code Patterns #3)
4. Call `gameApi.*` from a hook/component; handle loading + `ApiError.status` error states

**Modifying WebSocket protocol:**
1. Edit message types + logic in `server/gameshow-ws.ts`
2. Update `useGameShowWS()` hook to parse/send new messages
3. Update `GAMESHOW_API.md` with protocol changes

**Styling:**
- Uses React Native built-in styles (StyleSheet API)
- Color scheme: Orange accent (#FF6B35), light background (#FFE5D9)
- Responsive layout via `flex` + `alignItems`/`justifyContent`
- Safe area handled by `react-native-safe-area-context`

### Testing
- Jest preset: `jest-expo`
- Run with `npm test`
- No unit test suite committed yet — add tests as features stabilize

### E2E Testing (Playwright)
- Runs against the Expo **web** build (`expo start --web`, port 8081); config in `new-version-app/playwright.config.ts`, specs in `new-version-app/e2e/`
- Run with `npm run test:e2e` (also `:ui`, `:report`) from `new-version-app/`
- **File organization rule:**
  - **One spec file per screen.** Name it after the screen using kebab-case, matching the screen component (`LoginScreen.tsx` → `login.spec.ts`, `HomeScreen.tsx` → `home.spec.ts`, `LeaderboardScreen.tsx` → `leaderboard.spec.ts`).
  - **Multi-screen flows go in their own file named after the flow**, not the screen — e.g. a match/competition flow that moves across queue → match → results lives in `match-flow.spec.ts` (flow thi đấu). Do not scatter a single flow's steps across per-screen files.
- Anchor selectors to stable, user-visible copy (the UI is in Vietnamese); see `e2e/README.md` for the full convention.

## Common Issues & Solutions

**"Cannot find module" on startup:**
- Run `npm install` to ensure all dependencies are installed
- Clear Expo cache: `expo start --clear` or press `c` in dev server

**WebSocket fails to connect:**
- Ensure backend server is running: `npm run server`
- Check firewall (port 3000 for local, 443 for production WSS)
- Verify `EXPO_PUBLIC_WS_URL` in `.env` is correct

**Google OAuth fails:**
- Ensure Supabase OAuth app is configured (Settings → Auth Providers → Google)
- Verify redirect URI matches your app setup
- On native: check deep link configuration in `app.json`

**Environment variables not loading:**
- Vars must be prefixed `EXPO_PUBLIC_` to be bundled
- Restart dev server after `.env` changes
- Check `.env` file is in project root

**Type errors in "game-results.tsx" or "protected-route.tsx":**
- These files are intentionally excluded from `tsconfig.json` type-checking (legacy code)
- Ignore type errors or remove files if unused

## Deployment

The app is designed for **Expo managed workflow**:
1. **Preview**: `expo publish` (web) or build for internal testing
2. **Production**: Build via Expo Application Services (EAS) for iOS/Android stores
3. **Backend**: Deploy Node.js server to cloud (Vercel, Railway, Heroku, etc.)

See `docs/DEPLOYMENT.md` for detailed deployment steps.

## Documentation Files

- **QUICK_START.md** — 15-minute setup guide
- **REACT_NATIVE_IMPLEMENTATION.md** — Implementation walkthrough
- **REACT_NATIVE_COMPLETE_STRUCTURE.md** — Full file structure + features
- **GAMESHOW_API.md** — WebSocket protocol specification
- **AUTH_SETUP.md** — Authentication configuration
- **DEPLOYMENT.md** — Production deployment guide
- **RANKING_SYSTEM.md** — Scoring rules & leaderboard logic
- **SQL_FIX_GUIDE.md** — Database troubleshooting

## Git & Version Control

- Main branch: `main`
- Active branch: `feat/improve-ui-ux`
- Commit messages should be clear and describe the "why"
- Keep `.planning/` and `.claude/` directories separate from code commits (use `.gitignore`)
