export const PRAYER_NAMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];
/** The five obligatory prayers (sunrise is shown but is not a prayer). */
export const OBLIGATORY_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type ObligatoryPrayer = (typeof OBLIGATORY_PRAYERS)[number];

export type CalculationMethodId =
  | 'MuslimWorldLeague'
  | 'Karachi'
  | 'Egyptian'
  | 'UmmAlQura'
  | 'NorthAmerica'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran'
  | 'MoonsightingCommittee';

export type AsrMethod = 'standard' | 'hanafi';
export type HighLatitudeSetting = 'recommended' | 'middleofthenight' | 'seventhofthenight' | 'twilightangle';

export interface PrayerSettings {
  method: CalculationMethodId;
  asr: AsrMethod;
  highLatitude: HighLatitudeSetting;
  /** Manual minute offsets added after calculation. */
  adjustments: Record<PrayerName, number>;
  /** Whether the user explicitly chose a method (false until onboarding/settings). */
  confirmed: boolean;
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  method: 'MuslimWorldLeague',
  asr: 'standard',
  highLatitude: 'recommended',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  confirmed: false,
};

export interface PrayerLocation {
  latitude: number;
  longitude: number;
  /** IANA time zone of the location, e.g. "Asia/Kolkata". */
  timezone: string;
}

/** A calendar date in the location's own time zone. */
export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface DayPrayerTimes {
  date: LocalDate;
  times: Record<PrayerName, Date>;
}
