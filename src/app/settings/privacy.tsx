import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { AppText, Card, Divider, ListRow, Screen, ToggleRow } from '@/components/ui';
import { invalidateReading, keys } from '@/data/queries';
import { getUserDb } from '@/db';
import { clearReadingHistory, clearSearchHistory } from '@/features/userdata/repository';
import { useSettings } from '@/store/settings';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const dashboard = useSettings((s) => s.dashboard);
  const update = useSettings((s) => s.update);
  const [cleared, setCleared] = useState(false);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('more.privacy') }} />
      <Card>
        <AppText>{t('privacy.body')}</AppText>
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="analytics-outline" title={t('privacy.analytics')} subtitle={t('privacy.analyticsHint')} />
        <Divider />
        <ToggleRow title={t('home.prayerTracker')} value={dashboard.showPrayerTracker} onValueChange={(v) => update('dashboard', { showPrayerTracker: v })} />
        <Divider />
        <ToggleRow title={t('home.readingGoal')} value={dashboard.showReadingGoal} onValueChange={(v) => update('dashboard', { showReadingGoal: v })} />
        <Divider />
        <ToggleRow title={t('home.ayahOfDay')} value={dashboard.showDailyAyah} onValueChange={(v) => update('dashboard', { showDailyAyah: v })} />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <ListRow
          icon="trash-outline"
          destructive
          title={cleared ? t('privacy.cleared') : t('privacy.clearHistory')}
          onPress={() =>
            Alert.alert(t('privacy.clearHistory'), t('privacy.clearHistoryConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  await clearReadingHistory(getUserDb());
                  await clearSearchHistory(getUserDb());
                  invalidateReading(qc);
                  qc.invalidateQueries({ queryKey: keys.searchHistory });
                  setCleared(true);
                },
              },
            ])
          }
        />
      </Card>
    </Screen>
  );
}
