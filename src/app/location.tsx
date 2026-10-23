import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components/ui';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useSettings } from '@/store/settings';

export default function LocationScreen() {
  const { t } = useTranslation();
  const location = useSettings((s) => s.location);
  const set = useSettings((s) => s.set);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('location.title') }} />
      {location ? (
        <Card style={{ gap: 4 }}>
          <AppText variant="overline" tone="muted">
            {t('location.current')} · {t(`location.source.${location.source}`)}
          </AppText>
          <AppText variant="heading">{[location.name, location.region, location.country].filter(Boolean).join(', ')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('location.coordinates')}: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · {t('location.timezone')}: {location.timezone}
          </AppText>
        </Card>
      ) : null}
      <AppText variant="caption" tone="muted">
        {t('onboarding.locationBody')}
      </AppText>
      <LocationPicker
        onPick={(loc) => {
          set('location', loc);
          router.back();
        }}
      />
    </Screen>
  );
}
