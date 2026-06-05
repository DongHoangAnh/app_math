// Standard Expo Metro config. Extends Expo's defaults so the bundler behaves
// consistently across `expo start`, `expo export`, and EAS builds.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
