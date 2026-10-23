import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  AppText, ArabicText, Card, HeroCard, Icon, ProgressRing, Screen, SectionHeader, Skeleton, type IconName,
} from '@/components/ui';
import { SURAHS } from '@/content/generated/surahs';
import { useAyah, useLastRead, usePrayerLog, useReadToday, useSetPrayerStatus } from '@/data/queries';
import { formatHijri, toHijri } from '@/features/hijri/hijri';
import { dailyAyahId } from '@/features/quran/repository';
import { OBLIGATORY_PRAYERS } from '@/features/prayer/types';
import { usePrayerTimes } from '@/features/prayer/usePrayerTimes';
import { PrayerStateNotice } from '@/features/prayer/components';
import { useNow } from '@/hooks/useNow';
import { deviceTimeZone, formatCountdown, formatGregorian, formatTime, localDateKey, zonedLocalDate, zonedParts } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const now = useNow(1000);
  const prayer = usePrayerTimes(now);
  const location = useSettings((s) => s.location);
  const timeFormat = useSettings((s) => s.timeFormat);
  const hijriOffset = useSettings((s) => s.hijriOffsetDays);
  const dashboard = useSettings((s) => s.dashboard);
  const reading = useSettings((s) => s.reading);

  const tz = location?.timezone ?? deviceTimeZone();
  const today = zonedLocalDate(now, tz);
  const todayKey = localDateKey(today);
  const hour = zonedParts(now, tz).hour;
  const greeting = hour < 4 ? t('greeting.night') : hour < 12 ? t('greeting.morning') : hour < 17 ? t('greeting.afternoon') : hour < 21 ? t('greeting.evening') : t('greeting.night');
  const hijri = toHijri(today, hijriOffset);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" tone="muted">
            {t('greeting.salam')}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {greeting}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/location')}
          accessibilityRole="button"
          accessibilityLabel={`${t('location.title')}: ${location?.name ?? t('common.notSet')}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, maxWidth: '50%' }}
        >
          <Icon name="location-outline" size={14} color={theme.colors.primary} />
          <AppText variant="label" numberOfLines={1}>
            {location?.name ?? t('common.notSet')}
          </AppText>
        </Pressable>
      </View>

      <View>
        <AppText variant="bodyStrong" tone="gold">
          {hijri ? formatHijri(hijri, i18n.language === 'ar' ? 'ar' : 'en') : ''}
        </AppText>
        <AppText variant="caption" tone="muted">
          {formatGregorian(now, tz, i18n.language)}
        </AppText>
      </View>

      {prayer.status === 'ok' ? (
        <HeroCard>
          <AppText variant="overline" tone="onHeroMuted">
            {t('home.nextPrayer')}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <AppText variant="display" tone="onHero">
              {t(`prayer.names.${prayer.next.name}`)}
            </AppText>
            <AppText variant="heading" tone="onHero" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(prayer.next.time, prayer.location.timezone, timeFormat, i18n.language)}
            </AppText>
          </View>
          <AppText variant="bodyStrong" tone="onHeroMuted" style={{ fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="none">
            {t('home.inTime', { time: formatCountdown(prayer.next.time.getTime() - now.getTime()) })}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
            {OBLIGATORY_PRAYERS.map((p) => {
              const active = p === prayer.next.name && localDateKey(zonedLocalDate(prayer.next.time, prayer.location.timezone)) === prayer.todayKey;
              return (
                <Pressable key={p} onPress={() => router.push('/prayer')} style={{ alignItems: 'center', flex: 1, paddingVertical: 6, borderRadius: 12, backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
                  <AppText variant="caption" tone="onHeroMuted">
                    {t(`prayer.names.${p}`)}
                  </AppText>
                  <AppText variant="label" tone="onHero" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatTime(prayer.today.times[p], prayer.location.timezone, timeFormat, i18n.language).replace(/\s?[AP]M$/i, '')}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </HeroCard>
      ) : (
        <PrayerStateNotice state={prayer} />
      )}

      <ContinueReading />

      {dashboard.showPrayerTracker && prayer.status === 'ok' ? <PrayerTracker dateKey={prayer.todayKey} /> : null}
      {dashboard.showReadingGoal ? <ReadingGoal dateKey={todayKey} goal={reading.dailyGoalAyahs} /> : null}
      {dashboard.showDailyAyah ? <DailyAyah dateKey={todayKey} /> : null}

      <SectionHeader title={t('home.quickAccess')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <QuickTile icon="book-outline" label={t('tabs.quran')} onPress={() => router.push('/quran')} />
        <QuickTile icon="compass-outline" label={t('home.qibla')} onPress={() => router.push('/qibla')} />
        <QuickTile icon="ellipse-outline" label={t('home.tasbeeh')} onPress={() => router.push('/dhikr')} />
        <QuickTile icon="calendar-outline" label={t('home.calendar')} onPress={() => router.push('/calendar')} />
        <QuickTile icon="bookmark-outline" label={t('home.bookmarks')} onPress={() => router.push('/quran?tab=bookmarks')} />
        <QuickTile icon="search-outline" label={t('common.search')} onPress={() => router.push('/quran/search')} />
      </View>
    </Screen>
  );
}

function QuickTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '31.5%',
        flexGrow: 1,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 6,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={22} color={theme.colors.primary} />
      <AppText variant="label" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ContinueReading() {
  const { t } = useTranslation();
  const theme = useTheme();
  const last = useLastRead();
  if (last.isLoading) return <Skeleton height={86} radius={18} />;
  const pos = last.data;
  const surah = pos ? SURAHS[pos.surah - 1] : null;
  return (
    <Card
      onPress={() => router.push(pos ? `/quran/${pos.surah}?ayah=${pos.ayah}` : '/quran/1')}
      accessibilityLabel={pos && surah ? `${t('home.continueReading')}: ${surah.nameTranslit} ${pos.surah}:${pos.ayah}` : t('home.startReading')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="book" size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" tone="muted">
            {pos ? t('home.continueReading') : t('home.startReading')}
          </AppText>
          {pos && surah ? (
            <AppText variant="heading">
              {surah.nameTranslit} · {pos.surah}:{pos.ayah}
            </AppText>
          ) : (
            <AppText variant="caption" tone="muted">
              {t('home.startReadingHint')}
            </AppText>
          )}
        </View>
        {surah ? <ArabicText size={22} style={{ textAlign: 'left' }}>{surah.nameAr}</ArabicText> : null}
      </View>
    </Card>
  );
}

function DailyAyah({ dateKey }: { dateKey: string }) {
  const { t } = useTranslation();
  const editions = useSettings((s) => s.reading.translationIds);
  const id = dailyAyahId(dateKey);
  const ayah = useAyah(id, editions.slice(0, 1));
  if (ayah.isLoading) return <Skeleton height={140} radius={18} />;
  if (!ayah.data) return null;
  const a = ayah.data;
  const surah = SURAHS[a.surah - 1];
  return (
    <Card onPress={() => router.push(`/quran/${a.surah}?ayah=${a.ayah}`)} accessibilityLabel={`${t('home.ayahOfDay')} ${a.surah}:${a.ayah}`}>
      <AppText variant="overline" tone="gold">
        {t('home.ayahOfDay')}
      </AppText>
      <ArabicText size={24} style={{ marginTop: 8 }}>
        {a.text}
      </ArabicText>
      {a.translations[0] ? (
        <AppText variant="body" tone="muted" style={{ marginTop: 6 }} numberOfLines={6}>
          {a.translations[0].text}
        </AppText>
      ) : null}
      <AppText variant="label" tone="primary" style={{ marginTop: 8 }}>
        {surah.nameTranslit} {a.surah}:{a.ayah}
      </AppText>
    </Card>
  );
}

function ReadingGoal({ dateKey, goal }: { dateKey: string; goal: number }) {
  const { t } = useTranslation();
  const read = useReadToday(dateKey);
  const done = read.data ?? 0;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ProgressRing size={56} stroke={7} progress={goal ? done / goal : 0}>
          <AppText variant="label">{Math.min(100, Math.round((done / Math.max(goal, 1)) * 100))}%</AppText>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" tone="muted">
            {t('home.readingGoal')}
          </AppText>
          <AppText variant="bodyStrong">{t('home.readingGoalProgress', { done, goal })}</AppText>
        </View>
      </View>
    </Card>
  );
}

function PrayerTracker({ dateKey }: { dateKey: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const log = usePrayerLog(dateKey);
  const setStatus = useSetPrayerStatus(dateKey);
  return (
    <Card>
      <AppText variant="overline" tone="muted">
        {t('home.prayerTracker')}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        {OBLIGATORY_PRAYERS.map((p) => {
          const prayed = log.data?.[p] === 'prayed';
          return (
            <Pressable
              key={p}
              onPress={() => setStatus.mutate({ prayer: p, status: prayed ? null : 'prayed' })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: prayed }}
              accessibilityLabel={t(`prayer.names.${p}`)}
              style={{ alignItems: 'center', gap: 4, flex: 1 }}
            >
              <Icon name={prayed ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={prayed ? theme.colors.success : theme.colors.border} />
              <AppText variant="caption" tone={prayed ? 'default' : 'muted'}>
                {t(`prayer.names.${p}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
