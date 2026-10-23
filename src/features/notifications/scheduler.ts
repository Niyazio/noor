import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { calculateRange } from '@/features/prayer/engine';
import type { PrayerLocation, PrayerSettings } from '@/features/prayer/types';
import type { NotificationSettings } from '@/store/settings';
import i18n from '@/i18n';
import { formatTime } from '@/lib/time';
import { CHANNELS, NOTIFICATION_ID_PREFIX, diffSchedule, planPrayerNotifications } from './plan';

/** Days ahead to plan. The planner caps the total to stay below the iOS pending limit. */
const PLAN_DAYS = 7;

let inFlight: Promise<SyncResult> | null = null;

export type SyncResult =
  | { status: 'scheduled'; scheduled: number; cancelled: number; pending: number }
  | { status: 'no-permission' }
  | { status: 'no-location' }
  | { status: 'error'; message: string };

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const t = i18n.t.bind(i18n);
  await Notifications.setNotificationChannelAsync(CHANNELS.adhan, {
    name: t('notifications.channel.sound'),
    importance: AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.vibrate, {
    name: t('notifications.channel.vibrate'),
    importance: AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
    vibrationPattern: [0, 500, 250, 500],
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.silent, {
    name: t('notifications.channel.silent'),
    importance: AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.reminder, {
    name: t('notifications.channel.reminder'),
    importance: AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
  });
}

export async function getNotificationPermission() {
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission() {
  return Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
}

/**
 * Makes the OS's pending prayer notifications match the current settings.
 * Safe to call often (app start, foreground, settings/location change, background task);
 * concurrent calls share one run and identifiers are deterministic, so no duplicates.
 */
export function syncPrayerNotifications(args: {
  location: PrayerLocation | null;
  prayer: PrayerSettings;
  notifications: NotificationSettings;
  timeFormat: '12h' | '24h';
  now?: Date;
}): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync(args).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runSync({
  location,
  prayer,
  notifications,
  timeFormat,
  now = new Date(),
}: Parameters<typeof syncPrayerNotifications>[0]): Promise<SyncResult> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      await cancelAllPrayerNotifications();
      return { status: 'no-permission' };
    }
    if (!location) {
      await cancelAllPrayerNotifications();
      return { status: 'no-location' };
    }
    await ensureAndroidChannels();

    const days = calculateRange(location, prayer, now, PLAN_DAYS);
    const planned = planPrayerNotifications(days, notifications, location.timezone, now);
    const pendingRequests = await Notifications.getAllScheduledNotificationsAsync();
    const pending = pendingRequests.map((r) => ({
      id: r.identifier,
      fireTime: typeof r.content.data?.fireTime === 'number' ? (r.content.data.fireTime as number) : null,
    }));
    const { toCancel, toSchedule } = diffSchedule(planned, pending);

    await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    const t = i18n.t.bind(i18n);
    for (const n of toSchedule) {
      const prayerLabel = t(`prayer.names.${n.prayer}`);
      const time = formatTime(n.fireDate, location.timezone, timeFormat, i18n.language);
      const isSunrise = n.prayer === 'sunrise';
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title:
            n.kind === 'reminder'
              ? t('notifications.reminderTitle', { prayer: prayerLabel, minutes: n.minutesBefore })
              : isSunrise
                ? t('notifications.sunriseTitle')
                : t('notifications.prayerTitle', { prayer: prayerLabel }),
          body: t('notifications.body', { prayer: prayerLabel, time }),
          sound: n.mode === 'sound' ? 'default' : false,
          data: { fireTime: n.fireDate.getTime(), prayer: n.prayer, kind: n.kind, url: '/prayer' },
          ...(Platform.OS === 'ios' && n.kind === 'at-time' && n.mode === 'sound'
            ? { interruptionLevel: 'timeSensitive' as const }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.fireDate,
          channelId: n.channelId,
          delivery: notifications.androidAlarmClock && n.kind === 'at-time' ? 'alarmClock' : 'bestEffort',
        },
      });
    }
    const after = await Notifications.getAllScheduledNotificationsAsync();
    return {
      status: 'scheduled',
      scheduled: toSchedule.length,
      cancelled: toCancel.length,
      pending: after.filter((r) => r.identifier.startsWith(NOTIFICATION_ID_PREFIX)).length,
    };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function cancelAllPrayerNotifications(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((r) => r.identifier.startsWith(NOTIFICATION_ID_PREFIX))
      .map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)),
  );
}

/** Fires a test notification after a few seconds so users can check sound/vibration settings. */
export async function sendTestNotification(mode: 'sound' | 'silent' | 'vibrate'): Promise<void> {
  await ensureAndroidChannels();
  const t = i18n.t.bind(i18n);
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notifications.testTitle'), body: t('notifications.testBody'), sound: mode === 'sound' ? 'default' : false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: mode === 'sound' ? CHANNELS.adhan : mode === 'vibrate' ? CHANNELS.vibrate : CHANNELS.silent,
    },
  });
}

export async function getExactAlarmStatus(): Promise<'granted' | 'denied' | 'not-applicable'> {
  if (Platform.OS !== 'android') return 'not-applicable';
  const res = await Notifications.getExactAlarmPermissionsAsync();
  return res.granted ? 'granted' : 'denied';
}

export async function requestExactAlarm(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const res = await Notifications.requestExactAlarmPermissionsAsync();
  return res.granted;
}
