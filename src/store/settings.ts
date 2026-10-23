import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LanguageCode } from '@/i18n/languages';
import type { Accent, DarkStyle, ThemeMode } from '@/theme/themes';
import type { PrayerSettings, PrayerName } from '@/features/prayer/types';
import { DEFAULT_PRAYER_SETTINGS } from '@/features/prayer/types';
import type { SavedLocation } from '@/features/location/types';
import { kvStorage } from './kvStorage';

export type ArabicFont = 'amiri' | 'scheherazade';
export type TimeFormat = '12h' | '24h';
export type AlertMode = 'off' | 'sound' | 'silent' | 'vibrate';

export interface ReadingSettings {
  arabicFont: ArabicFont;
  arabicSize: number;
  translationSize: number;
  lineHeight: number; // multiplier
  layout: 'comfortable' | 'compact';
  showTranslation: boolean;
  translationIds: string[];
  dailyGoalAyahs: number;
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
  prayer: PrayerSettings;
  location: SavedLocation | null;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  /** Manual Hijri correction (days) to follow a local moon-sighting authority. */
  hijriOffsetDays: number;
  analyticsOptIn: boolean;

  set: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  update: <K extends 'reading' | 'prayer' | 'notifications' | 'dashboard'>(
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
  },
  prayer: DEFAULT_PRAYER_SETTINGS,
  location: null,
  notifications: {
    prayers: {
      fajr: alert('sound'),
      sunrise: alert('off'),
      dhuhr: alert('sound'),
      asr: alert('sound'),
      maghrib: alert('sound'),
      isha: alert('sound'),
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
