import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import i18n from '@/i18n';
import { useSettings, waitForSettingsHydration } from '@/store/settings';
import { syncPrayerNotifications } from './scheduler';

export const PRAYER_TOPUP_TASK = 'noor.prayer-notifications-topup';

/**
 * Background top-up: keeps a rolling window of prayer alerts scheduled even if the app is
 * not opened for days. The OS decides when this runs (iOS especially), so the app also
 * re-syncs on every launch and foreground.
 */
TaskManager.defineTask(PRAYER_TOPUP_TASK, async () => {
  try {
    await waitForSettingsHydration();
    const s = useSettings.getState();
    if (i18n.language !== s.language) await i18n.changeLanguage(s.language);
    const r = await syncPrayerNotifications({
      location: s.location,
      prayer: s.prayer,
      notifications: s.notifications,
      timeFormat: s.timeFormat,
    });
    return r.status === 'error' ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerPrayerTopupTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (!(await TaskManager.isTaskRegisteredAsync(PRAYER_TOPUP_TASK))) {
      await BackgroundTask.registerTaskAsync(PRAYER_TOPUP_TASK, { minimumInterval: 12 * 60 });
    }
  } catch {
    // Background execution unavailable (e.g. Expo Go); foreground sync still applies.
  }
}
