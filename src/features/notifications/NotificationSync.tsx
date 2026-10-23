import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/store/settings';
import { registerPrayerTopupTask } from './backgroundTask';
import { syncPrayerNotifications } from './scheduler';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function syncNow() {
  const s = useSettings.getState();
  if (!s.onboarded) return;
  void syncPrayerNotifications({
    location: s.location,
    prayer: s.prayer,
    notifications: s.notifications,
    timeFormat: s.timeFormat,
  });
}

/**
 * Keeps scheduled prayer alerts in sync with settings. Runs on launch, when the app
 * returns to the foreground (covers date, time-zone and DST changes) and whenever
 * location, calculation or alert settings change.
 */
export function NotificationSync() {
  const location = useSettings((s) => s.location);
  const prayer = useSettings((s) => s.prayer);
  const notifications = useSettings((s) => s.notifications);
  const timeFormat = useSettings((s) => s.timeFormat);
  const language = useSettings((s) => s.language);
  const onboarded = useSettings((s) => s.onboarded);

  useEffect(() => {
    syncNow();
  }, [location, prayer, notifications, timeFormat, language, onboarded]);

  useEffect(() => {
    registerPrayerTopupTask();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && syncNow());
    const resp = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    });
    return () => {
      sub.remove();
      resp.remove();
    };
  }, []);

  return null;
}
