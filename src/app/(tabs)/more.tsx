import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Divider, ListRow, Screen, SectionHeader } from '@/components/ui';
import brand from '@/config/brand.json';
import { LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/store/settings';

export default function MoreScreen() {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const location = useSettings((s) => s.location);
  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('more.title')}
      </AppText>

      <SectionHeader title={t('more.features')} />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="compass-outline" title={t('qibla.title')} onPress={() => router.push('/qibla')} />
        <Divider />
        <ListRow icon="calendar-outline" title={t('calendar.title')} onPress={() => router.push('/calendar')} />
        <Divider />
        <ListRow icon="bookmark-outline" title={t('quran.bookmarks')} onPress={() => router.push('/quran?tab=bookmarks')} />
        <Divider />
        <ListRow icon="search-outline" title={t('common.search')} onPress={() => router.push('/quran/search')} />
      </Card>

      <SectionHeader title={t('more.settings')} />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="location-outline" title={t('more.location')} value={location?.name ?? t('common.notSet')} onPress={() => router.push('/location')} />
        <Divider />
        <ListRow icon="time-outline" title={t('more.prayer')} onPress={() => router.push('/settings/prayer')} />
        <Divider />
        <ListRow icon="notifications-outline" title={t('more.notifications')} onPress={() => router.push('/settings/notifications')} />
        <Divider />
        <ListRow icon="book-outline" title={t('more.reading')} onPress={() => router.push('/settings/reading')} />
        <Divider />
        <ListRow icon="color-palette-outline" title={t('more.appearance')} onPress={() => router.push('/settings/appearance')} />
        <Divider />
        <ListRow icon="language-outline" title={t('more.language')} value={LANGUAGES.find((l) => l.code === language)?.native} onPress={() => router.push('/settings/language')} />
        <Divider />
        <ListRow icon="shield-checkmark-outline" title={t('more.privacy')} onPress={() => router.push('/settings/privacy')} />
      </Card>

      <SectionHeader title={t('more.about')} />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="library-outline" title={t('more.sources')} onPress={() => router.push('/sources')} />
      </Card>
      <AppText variant="caption" tone="muted" align="center">
        {brand.appName} — {brand.tagline} · {t('more.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>
    </Screen>
  );
}
