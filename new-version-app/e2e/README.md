# E2E Tests (Playwright)

End-to-end tests for the Expo **web** build of mathup-mobile. They drive the
same React Native code that ships to native, rendered via `react-native-web`.

## Running

```bash
cd new-version-app
npm run test:e2e          # headless; auto-boots Expo web (port 8081)
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # open last HTML report
```

The `webServer` block in `playwright.config.ts` starts `npm run web`
automatically and reuses an already-running server locally.

## File organization rule

- **One spec file per screen.** Name the file after the screen in kebab-case,
  mirroring the screen component in `client/src/screens/`:

  | Screen component            | Spec file              |
  | --------------------------- | ---------------------- |
  | `LoginScreen.tsx`           | `login.spec.ts`        |
  | `RegisterScreen.tsx`        | `register.spec.ts`     |
  | `HomeScreen.tsx`            | `home.spec.ts`         |
  | `GameShowScreen.tsx`        | `game-show.spec.ts`    |
  | `LeaderboardScreen.tsx`     | `leaderboard.spec.ts`  |
  | `StatisticsScreen.tsx`      | `statistics.spec.ts`   |
  | `ProfileScreen.tsx`         | `profile.spec.ts`      |

- **Flows that move across multiple screens get their own file, named after the
  flow** (not after any single screen). Examples:

  | Flow                                              | Spec file                |
  | ------------------------------------------------- | ------------------------ |
  | Đấu trận: queue → match found → play → results    | `match-flow.spec.ts`     |
  | Đăng nhập → home → vào game                        | `login-to-game.spec.ts`  |
  | Quên mật khẩu → reset                              | `password-reset.spec.ts` |

  Keep a flow's steps together in its flow file. Do **not** split a single flow
  across the per-screen files.

## Selector convention

The UI copy is in **Vietnamese** — anchor selectors to that stable, visible
text rather than brittle structure:

- Prefer `getByText('Đăng nhập', { exact: true })`, `getByPlaceholder('example@email.com')`.
- React Native Web mounts the app into `#root`; wait for it before asserting.
- Add `testID` props in the RN components when text is ambiguous — they surface
  as `data-testid` on web, usable via `getByTestId(...)`.
