import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LanguageCode } from '@/i18n/languages';
import type { Accent, DarkStyle, ReadingThemeId, ThemeMode } from '@/theme/themes';
import type { PrayerSettings, PrayerName } from '@/features/prayer/types';
import { DEFAULT_PRAYER_SETTINGS } from '@/features/prayer/types';
import type { SavedLocation } from '@/features/location/types';
import { kvStorage } from './kvStorage';

export type ArabicFont = 'amiri' | 'scheherazade';
export type TimeFormat = '12h' | '24h';
/** `adhan` plays the Azan recording (when one is installed), `sound` the default notification tone. */
export type AlertMode = 'off' | 'adhan' | 'sound' | 'silent' | 'vibrate';
export type ReaderMode = 'mushaf' | 'translation';

export interface ReadingSettings {
  arabicFont: ArabicFont;
  arabicSize: number;
  translationSize: number;
  lineHeight: number; // multiplier
  layout: 'comfortable' | 'compact';
  showTranslation: boolean;
  translationIds: string[];
  dailyGoalAyahs: number;
  /** Mushaf (page by page, like a printed Quran) or verse cards with translation. */
  mode: ReaderMode;
  theme: ReadingThemeId;
}

export interface AudioSettings {
  reciterId: string;
  speed: number;
  /** Times each ayah is played (1 = once). 0 = repeat forever. */
  repeatAyah: number;
  /** Continue into the next surah when one ends. */
  continuous: boolean;
  /** Play the Azan inside the app at prayer time while the app is open. */
  inAppAdhan: boolean;
}

export interface PrayerAlertSettings {
  mode: AlertMode;
  /** Minutes before the prayer for an extra reminder, or null for none. */
  reminderMinutes: number | null;
}

export interface NotificationSettings {
  prayers: Record<Exclude<PrayerName, 'sunrise'>, PrayerAlertSettings> & { sunrise: PrayerAlertSettings };
  quietHours: { enabled: boolean; start: string; end: string };
  /** Android only: deliver with setAlarmClock() so battery optimisation cannot defer it. */
  androidAlarmClock: boolean;
}

export interface DashboardSettings {
  showDailyAyah: boolean;
  showPrayerTracker: boolean;
  showReadingGoal: boolean;
  showStreaks: boolean;
}

export interface SettingsState {
  onboarded: boolean;
  language: LanguageCode;
  themeMode: ThemeMode;
  darkStyle: DarkStyle;
  accent: Accent;
  timeFormat: TimeFormat;
  haptics: boolean;
  reading: ReadingSettings;
  audio: AudioSettings;
  prayer: PrayerSettings;
  location: SavedLocation | null;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  /** Manual Hijri correction (days) to follow a local moon-sighting authority. */
  hijriOffsetDays: number;
  analyticsOptIn: boolean;

  set: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  update: <K extends 'reading' | 'audio' | 'prayer' | 'notifications' | 'dashboard'>(
    key: K,
    patch: Partial<SettingsData[K]>,
  ) => void;
  setPrayerAlert: (prayer: PrayerName, patch: Partial<PrayerAlertSettings>) => void;
  reset: () => void;
}

export type SettingsData = Omit<SettingsState, 'set' | 'update' | 'setPrayerAlert' | 'reset'>;

const alert = (mode: AlertMode): PrayerAlertSettings => ({ mode, reminderMinutes: null });

export const DEFAULT_SETTINGS: SettingsData = {
  onboarded: false,
  language: 'en',
  themeMode: 'system',
  darkStyle: 'navy',
  accent: 'emerald',
  timeFormat: '12h',
  haptics: true,
  reading: {
    arabicFont: 'amiri',
    arabicSize: 28,
    translationSize: 16,
    lineHeight: 1.9,
    layout: 'comfortable',
    showTranslation: true,
    translationIds: ['en.shakir'],
    dailyGoalAyahs: 10,
    mode: 'mushaf',
    theme: 'auto',
  },
  audio: { reciterId: 'minshawi_mujawwad', speed: 1, repeatAyah: 1, continuous: true, inAppAdhan: true },
  prayer: DEFAULT_PRAYER_SETTINGS,
  location: null,
  notifications: {
    prayers: {
      fajr: alert('adhan'),
      sunrise: alert('off'),
      dhuhr: alert('adhan'),
      asr: alert('adhan'),
      maghrib: alert('adhan'),
      isha: alert('adhan'),
    },
    quietHours: { enabled: false, start: '23:00', end: '05:00' },
    androidAlarmClock: false,
  },
  dashboard: { showDailyAyah: true, showPrayerTracker: true, showReadingGoal: true, showStreaks: false },
  hijriOffsetDays: 0,
  analyticsOptIn: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      update: (key, patch) =>
        set((s) => ({ [key]: { ...(s[key] as object), ...patch } }) as Partial<SettingsState>),
      setPrayerAlert: (prayer, patch) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            prayers: { ...s.notifications.prayers, [prayer]: { ...s.notifications.prayers[prayer], ...patch } },
          },
        })),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'noor.settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => {
        const { set: _s, update: _u, setPrayerAlert: _p, reset: _r, ...data } = s;
        return data;
      },
      // Deep-merge nested objects so new settings keys get defaults after an app update.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsData>;
        return {
          ...current,
          ...p,
          reading: { ...current.reading, ...p.reading },
          audio: { ...current.audio, ...p.audio },
          prayer: {
            ...current.prayer,
            ...p.prayer,
            adjustments: { ...current.prayer.adjustments, ...p.prayer?.adjustments },
          },
          notifications: {
            ...current.notifications,
            ...p.notifications,
            prayers: { ...current.notifications.prayers, ...p.notifications?.prayers },
          },
          dashboard: { ...current.dashboard, ...p.dashboard },
        };
      },
    },
  ),
);

/** Resolves once persisted settings have been loaded from disk. */
export function waitForSettingsHydration(): Promise<void> {
  if (useSettings.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useSettings.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
