import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Azan recording bundled into the native build (see docs/AZAN.md). The file is optional:
 * app.config.ts registers assets/sounds/adhan.* with expo-notifications only when present.
 */
export function bundledAdhanSound(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { adhanSoundAndroid?: string | null; adhanSoundIos?: string | null };
  if (Platform.OS === 'android') return extra.adhanSoundAndroid ?? null;
  if (Platform.OS === 'ios') return extra.adhanSoundIos ?? null;
  return null;
}
