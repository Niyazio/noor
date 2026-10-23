import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, Platform, ScrollView, View } from 'react-native';

import { AppText, Button, Card, Chip, Divider, Notice, Screen, SectionHeader, Segmented, ToggleRow } from '@/components/ui';
import { NOTIFICATION_ID_PREFIX } from '@/features/notifications/plan';
import {
  getExactAlarmStatus, requestExactAlarm, requestNotificationPermission, sendTestNotification,
} from '@/features/notifications/scheduler';
import { PRAYER_NAMES } from '@/features/prayer/types';
import { useSettings, type AlertMode } from '@/store/settings';

const REMINDER_OPTIONS = [null, 5, 10, 15, 20, 30] as const;

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const notifications = useSettings((s) => s.notifications);
  const setPrayerAlert = useSettings((s) => s.setPrayerAlert);
  const update = useSettings((s) => s.update);
  const [testSent, setTestSent] = useState(false);
  const status = useQuery({
    queryKey: ['notificationStatus', notifications],
    queryFn: async () => {
      // Give the settings-triggered sync a moment to finish before counting.
      await new Promise((r) => setTimeout(r, 600));
      const p = await Notifications.getPermissionsAsync();
      const all = await Notifications.getAllScheduledNotificationsAsync();
      return {
        permission: p.granted ? ('granted' as const) : p.canAskAgain ? ('undetermined' as const) : ('denied' as const),
        exact: await getExactAlarmStatus().catch(() => 'not-applicable' as const),
        pending: all.filter((n) => n.identifier.startsWith(NOTIFICATION_ID_PREFIX)).length,
      };
    },
    staleTime: 0,
  });
  const { refetch } = status;
  const refresh = useCallback(() => void refetch(), [refetch]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  const permission = status.data?.permission ?? null;
  const exact = status.data?.exact ?? null;
  const pending = status.data?.pending ?? null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('notifications.title') }} />

      {permission === 'denied' ? (
        <Notice tone="warning">
          <AppText variant="caption">{t('notifications.permissionDenied')}</AppText>
          <Button variant="ghost" title={t('notifications.openSettings')} onPress={() => Linking.openSettings()} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
        </Notice>
      ) : permission === 'undetermined' ? (
        <Button icon="notifications" title={t('onboarding.allowNotifications')} onPress={async () => { await requestNotificationPermission(); refresh(); }} />
      ) : null}

      {PRAYER_NAMES.map((p) => {
        const pref = notifications.prayers[p];
        return (
          <Card key={p} style={{ gap: 10 }}>
            <AppText variant="heading">{t(`prayer.names.${p}`)}</AppText>
            <Segmented<AlertMode>
              value={pref.mode}
              onChange={(mode) => setPrayerAlert(p, { mode })}
              options={(['off', 'sound', 'vibrate', 'silent'] as const).map((m) => ({ value: m, label: t(`notifications.modes.${m}`) }))}
            />
            {pref.mode !== 'off' ? (
              <View style={{ gap: 6 }}>
                <AppText variant="caption" tone="muted">
                  {t('notifications.reminderBefore')}
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {REMINDER_OPTIONS.map((m) => (
                    <Chip
                      key={String(m)}
                      label={m == null ? t('notifications.none') : t('common.minutes', { count: m })}
                      selected={pref.reminderMinutes === m}
                      onPress={() => setPrayerAlert(p, { reminderMinutes: m })}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow
          title={t('notifications.quietHours')}
          subtitle={`${notifications.quietHours.start}–${notifications.quietHours.end}. ${t('notifications.quietHoursHint')}`}
          value={notifications.quietHours.enabled}
          onValueChange={(enabled) => update('notifications', { quietHours: { ...notifications.quietHours, enabled } })}
        />
      </Card>

      {Platform.OS === 'android' ? (
        <>
          <SectionHeader title={t('notifications.exactAlarmTitle')} />
          <Card style={{ gap: 10 }}>
            <AppText variant="caption" tone="muted">
              {exact === 'granted' ? t('notifications.exactAlarmGranted') : t('notifications.exactAlarmBody')}
            </AppText>
            {exact === 'denied' ? (
              <Button variant="secondary" title={t('common.enable')} onPress={async () => { await requestExactAlarm(); refresh(); }} />
            ) : null}
            <Divider />
            <ToggleRow
              title={t('notifications.alarmClockMode')}
              subtitle={t('notifications.alarmClockHint')}
              value={notifications.androidAlarmClock}
              onValueChange={(v) => update('notifications', { androidAlarmClock: v })}
            />
            <AppText variant="caption" tone="muted">
              {t('notifications.batteryHint')}
            </AppText>
          </Card>
        </>
      ) : null}

      <Notice tone="warning" icon="volume-high-outline">
        {t('notifications.adhanLimitation')}
      </Notice>

      {pending != null && permission === 'granted' ? (
        <AppText variant="caption" tone="muted" align="center">
          {t('notifications.scheduled', { count: pending })}
        </AppText>
      ) : null}
      <Button
        variant="secondary"
        icon="paper-plane-outline"
        title={testSent ? t('notifications.testSent') : t('notifications.sendTest')}
        disabled={permission !== 'granted'}
        onPress={async () => {
          await sendTestNotification('sound');
          setTestSent(true);
        }}
      />
    </Screen>
  );
}
