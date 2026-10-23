// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The read-only Quran/translation/city content database is shipped as an asset.
config.resolver.assetExts.push('db');
// expo-sqlite's web worker (used for browser-based QA) loads SQLite as WebAssembly.
config.resolver.assetExts.push('wasm');

module.exports = config;
