import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

import brand from './src/config/brand.json';

/**
 * Optional Azan recordings (see docs/AZAN.md). Only licensed recordings should be added.
 * Android: assets/sounds/adhan.mp3 (any length, played in full as the alert sound).
 * iOS: assets/sounds/adhan.wav or adhan.caf (iOS plays at most 30 seconds).
 */
const soundFile = (...names: string[]) => names.find((n) => fs.existsSync(path.join(__dirname, 'assets/sounds', n))) ?? null;
const adhanAndroid = soundFile('adhan.mp3', 'adhan.wav', 'adhan.ogg');
const adhanIos = soundFile('adhan.caf', 'adhan.wav', 'adhan.aiff');
const notificationSounds = [...new Set([adhanAndroid, adhanIos].filter((f): f is string => !!f))].map((f) => `./assets/sounds/${f}`);

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
  web: { favicon: './assets/favicon.png', name: brand.appName, shortName: brand.appName, themeColor: brand.colors.emerald, backgroundColor: brand.colors.ivory },
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
        sounds: notificationSounds,
      },
    ],
    ['expo-audio', { microphonePermission: false, enableBackgroundPlayback: true }],
    ['expo-sensors', { motionPermission: 'Motion sensors are used to point the Qibla compass.' }],
  ],
  // EXPO_BASE_URL serves the web app from a sub-path (e.g. "/app" next to the download page).
  experiments: { typedRoutes: true, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
  extra: {
    // Public values only. Never place a Supabase service-role key here.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? null,
    contentCdnUrl: process.env.EXPO_PUBLIC_CONTENT_CDN_URL ?? null,
    adhanSoundAndroid: adhanAndroid,
    adhanSoundIos: adhanIos,
  },
});
