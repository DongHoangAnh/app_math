// Standard Expo Metro config. Extends Expo's defaults so the bundler behaves
// consistently across `expo start`, `expo export`, and EAS builds.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo SDK 54's default config sets `watcher.unstable_workerThreads`, but the
// pinned Metro (0.83.x) config validator doesn't recognize it yet and prints
// "Unknown option" on every build. The value is already `false`, so dropping the
// key silences the warning without changing behavior. Remove once Metro's schema
// catches up (a future Expo SDK bump).
if (config.watcher) {
  delete config.watcher.unstable_workerThreads;
}

module.exports = config;
