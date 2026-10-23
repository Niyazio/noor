import type { ConfigContext, ExpoConfig } from 'expo/config';

import brand from './src/config/brand.json';

/**
 * Branding (name, identifiers, colours) lives in src/config/brand.json so it can be
 * changed in one place. Permissions are limited to what shipped features use.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: brand.appName,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: brand.iosBundleIdentifier,
    buildNumber: '1',
    infoPlist: {
      // Recitation keeps playing with the screen locked.
      UIBackgroundModes: ['audio'],
      ITSAppUsesNonExemptEncryption: false,
    },
    // Lets prayer-time alerts break through Focus summaries when the user allows it.
    entitlements: { 'com.apple.developer.usernotifications.time-sensitive': true },
  },
  android: {
    package: brand.androidPackage,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: brand.colors.emerald,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Coarse + fine foreground location only. No background location is requested:
    // prayer times are calculated from the last saved coordinates.
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
      // User-granted on Android 12+; requested only from Prayer alerts settings. Without it,
      // Android may deliver prayer notifications a few minutes late.
      'SCHEDULE_EXACT_ALARM',
    ],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.RECORD_AUDIO'],
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-sqlite',
    'expo-font',
    'expo-localization',
    'expo-sharing',
    'expo-background-task',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: brand.colors.ivory,
        dark: { image: './assets/splash-icon.png', backgroundColor: brand.colors.navy },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Your location is used on this device to calculate prayer times and the Qibla direction. It is not uploaded.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        color: brand.colors.emerald,
        // Licensed Adhan clips (iOS: <= 30 s, .caf/.wav/.aiff) go in assets/sounds and are listed here.
        sounds: [],
      },
    ],
    ['expo-audio', { microphonePermission: false, enableBackgroundPlayback: true }],
    ['expo-sensors', { motionPermission: 'Motion sensors are used to point the Qibla compass.' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    // Public values only. Never place a Supabase service-role key here.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    contentCdnUrl: process.env.EXPO_PUBLIC_CONTENT_CDN_URL ?? null,
  },
});
