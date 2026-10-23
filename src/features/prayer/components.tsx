import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Icon } from '@/components/ui';
import { formatTime } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { PRAYER_NAMES, type DayPrayerTimes, type ObligatoryPrayer, type PrayerName } from './types';
import type { PrayerTimesState } from './usePrayerTimes';

export function PrayerTimesList({
  day,
  timezone,
  highlight,
  log,
  onToggle,
}: {
  day: DayPrayerTimes;
  timezone: string;
  highlight?: PrayerName | null;
  log?: Partial<Record<ObligatoryPrayer, 'prayed' | 'missed'>>;
  onToggle?: (p: ObligatoryPrayer) => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const timeFormat = useSettings((s) => s.timeFormat);
  return (
    <View>
      {PRAYER_NAMES.map((name) => {
        const isNext = highlight === name;
        const isSunrise = name === 'sunrise';
        const prayed = !isSunrise && log?.[name as ObligatoryPrayer] === 'prayed';
        return (
          <View
            key={name}
            accessible
            accessibilityLabel={`${t(`prayer.names.${name}`)} ${formatTime(day.times[name], timezone, timeFormat, i18n.language)}${isNext ? `, ${t('home.nextPrayer')}` : ''}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 11,
              paddingHorizontal: 12,
              borderRadius: theme.radius.md,
              backgroundColor: isNext ? theme.colors.primarySoft : 'transparent',
              opacity: isSunrise ? 0.75 : 1,
            }}
          >
            <Icon
              name={isSunrise ? 'sunny-outline' : isNext ? 'notifications' : 'ellipse-outline'}
              size={isSunrise || isNext ? 18 : 8}
              color={isNext ? theme.colors.primary : theme.colors.textMuted}
            />
            <AppText variant={isNext ? 'bodyStrong' : 'body'} tone={isNext ? 'primary' : 'default'} style={{ flex: 1, marginLeft: 12 }}>
              {t(`prayer.names.${name}`)}
            </AppText>
            <AppText variant={isNext ? 'bodyStrong' : 'body'} tone={isNext ? 'primary' : 'default'} style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(day.times[name], timezone, timeFormat, i18n.language)}
            </AppText>
            {onToggle && !isSunrise ? (
              <Pressable
                onPress={() => onToggle(name as ObligatoryPrayer)}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: prayed }}
                accessibilityLabel={`${t('prayer.markPrayed')}: ${t(`prayer.names.${name}`)}`}
                style={{ marginLeft: 14 }}
              >
                <Icon name={prayed ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={prayed ? theme.colors.success : theme.colors.border} />
              </Pressable>
            ) : onToggle ? (
              <View style={{ width: 38 }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Honest empty/error states — prayer times are never shown without a valid calculation. */
export function PrayerStateNotice({ state }: { state: Exclude<PrayerTimesState, { status: 'ok' }> }) {
  const { t } = useTranslation();
  if (state.status === 'no-location') {
    return (
      <Card>
        <EmptyState
          icon="location-outline"
          title={t('prayer.noLocationTitle')}
          body={t('prayer.noLocationBody')}
          action={<Button title={t('home.setLocationAction')} onPress={() => router.push('/location')} />}
        />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        icon="alert-circle-outline"
        title={t('prayer.calcErrorTitle')}
        body={t('prayer.calcErrorBody')}
        action={<Button title={t('prayer.settings')} variant="secondary" onPress={() => router.push('/settings/prayer')} />}
      />
    </Card>
  );
}
