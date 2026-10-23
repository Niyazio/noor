import { localDateKey, zonedParts } from '@/lib/time';
import type { DayPrayerTimes, PrayerName } from '@/features/prayer/types';
import type { AlertMode, NotificationSettings } from '@/store/settings';

/** Android channel ids. Channel sound/vibration is immutable once created, so ids are versioned. */
export const CHANNELS = {
  sound: 'prayer-sound-v1',
  silent: 'prayer-silent-v1',
  vibrate: 'prayer-vibrate-v1',
  reminder: 'prayer-reminder-v1',
} as const;

export const NOTIFICATION_ID_PREFIX = 'noor.prayer.';
/** iOS keeps at most 64 pending local notifications per app; leave headroom for other features. */
export const MAX_PENDING_PRAYER_NOTIFICATIONS = 56;

export interface PlannedNotification {
  id: string;
  prayer: PrayerName;
  kind: 'at-time' | 'reminder';
  mode: Exclude<AlertMode, 'off'>;
  fireDate: Date;
  channelId: string;
  minutesBefore?: number;
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** True if the instant falls inside the quiet window (which may cross midnight). */
export function inQuietHours(date: Date, timeZone: string, quiet: NotificationSettings['quietHours']): boolean {
  if (!quiet.enabled) return false;
  const { hour, minute } = zonedParts(date, timeZone);
  const t = hour * 60 + minute;
  const start = minutesOfDay(quiet.start);
  const end = minutesOfDay(quiet.end);
  return start <= end ? t >= start && t < end : t >= start || t < end;
}

/**
 * Android notification channels cannot change their sound after creation, so the Azan channel id
 * includes the bundled sound's file name (or "default" when no Azan recording is bundled).
 */
export function adhanChannelId(soundFile: string | null): string {
  return `prayer-adhan-${(soundFile ?? 'default').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-v1`;
}

function channelFor(mode: Exclude<AlertMode, 'off'>, kind: PlannedNotification['kind'], adhanChannel: string) {
  if (kind === 'reminder') return CHANNELS.reminder;
  if (mode === 'adhan') return adhanChannel;
  return mode === 'sound' ? CHANNELS.sound : mode === 'vibrate' ? CHANNELS.vibrate : CHANNELS.silent;
}

/**
 * Builds the complete, de-duplicated set of notifications that should be pending.
 * Pure function: the scheduler diffs this against what the OS reports.
 */
export function planPrayerNotifications(
  days: DayPrayerTimes[],
  settings: NotificationSettings,
  timeZone: string,
  now: Date,
  limit = MAX_PENDING_PRAYER_NOTIFICATIONS,
  adhanChannel = adhanChannelId(null),
): PlannedNotification[] {
  const planned: PlannedNotification[] = [];
  for (const day of days) {
    const key = localDateKey(day.date);
    for (const prayer of Object.keys(day.times) as PrayerName[]) {
      const pref = settings.prayers[prayer];
      if (!pref || pref.mode === 'off') continue;
      const at = day.times[prayer];
      // Quiet hours downgrade audible alerts to silent notifications; they never drop a prayer alert.
      const audible = pref.mode === 'sound' || pref.mode === 'adhan';
      const mode = audible && inQuietHours(at, timeZone, settings.quietHours) ? 'silent' : pref.mode;
      planned.push({
        id: `${NOTIFICATION_ID_PREFIX}${key}.${prayer}.at`,
        prayer,
        kind: 'at-time',
        mode,
        fireDate: at,
        channelId: channelFor(mode, 'at-time', adhanChannel),
      });
      if (pref.reminderMinutes && pref.reminderMinutes > 0) {
        planned.push({
          id: `${NOTIFICATION_ID_PREFIX}${key}.${prayer}.before${pref.reminderMinutes}`,
          prayer,
          kind: 'reminder',
          mode: 'silent',
          fireDate: new Date(at.getTime() - pref.reminderMinutes * 60_000),
          channelId: CHANNELS.reminder,
          minutesBefore: pref.reminderMinutes,
        });
      }
    }
  }
  const seen = new Set<string>();
  return planned
    .filter((n) => n.fireDate.getTime() > now.getTime() + 5_000)
    .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
    .sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime())
    .slice(0, limit);
}

export interface ScheduleDiff {
  toCancel: string[];
  toSchedule: PlannedNotification[];
}

/**
 * Compares the desired plan with identifiers already pending in the OS. Notifications
 * whose id matches but whose time changed must be replaced, so the fire time is encoded
 * in a fingerprint map supplied by the caller.
 */
export function diffSchedule(
  planned: PlannedNotification[],
  pending: { id: string; fireTime: number | null }[],
): ScheduleDiff {
  const pendingOurs = pending.filter((p) => p.id.startsWith(NOTIFICATION_ID_PREFIX));
  const pendingById = new Map(pendingOurs.map((p) => [p.id, p.fireTime]));
  const plannedById = new Map(planned.map((p) => [p.id, p]));
  const toCancel = pendingOurs
    .filter((p) => {
      const want = plannedById.get(p.id);
      return !want || p.fireTime === null || Math.abs(want.fireDate.getTime() - p.fireTime) > 30_000;
    })
    .map((p) => p.id);
  const cancelled = new Set(toCancel);
  const toSchedule = planned.filter((p) => !pendingById.has(p.id) || cancelled.has(p.id));
  return { toCancel, toSchedule };
}
