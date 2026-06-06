// Local Expo config plugin: strip the RECORD_AUDIO permission on Android.
//
// expo-audio's config plugin is auto-applied by Expo autolinking with its
// default options (recordAudioAndroid: true), and createRunOncePlugin makes the
// explicit `[ "expo-audio", { recordAudioAndroid: false } ]` entry in app.json a
// no-op. So options alone can't drop the permission. This app only PLAYS sound
// effects and never records, so we remove RECORD_AUDIO here instead.
//
// Listed LAST in app.json `plugins` so it runs after expo-audio. It also emits a
// `tools:node="remove"` directive so Gradle's manifest merger drops the
// permission even if a dependency's AAR manifest re-declares it — keeping Google
// Play from flagging an unused, sensitive microphone permission.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const RECORD_AUDIO = 'android.permission.RECORD_AUDIO';

const withoutRecordAudio = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure the `tools` XML namespace exists so tools:node is valid.
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Drop any existing RECORD_AUDIO declaration, then add an explicit remove.
    const perms = manifest['uses-permission'] || [];
    const kept = perms.filter((p) => p?.$?.['android:name'] !== RECORD_AUDIO);
    kept.push({ $: { 'android:name': RECORD_AUDIO, 'tools:node': 'remove' } });
    manifest['uses-permission'] = kept;

    return cfg;
  });
};

module.exports = withoutRecordAudio;
