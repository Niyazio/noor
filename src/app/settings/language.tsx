import { Stack } from 'expo-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Divider, Icon, ListRow, Notice, Screen } from '@/components/ui';
import { applyLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function LanguageSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const [needsRestart, setNeedsRestart] = useState(false);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('more.language') }} />
      {needsRestart ? <Notice tone="warning">{t('appearance.restartForDirection')}</Notice> : null}
      <Card style={{ paddingVertical: 4 }}>
        {LANGUAGES.map((l, i) => (
          <Fragment key={l.code}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={l.native}
              subtitle={l.name}
              onPress={() => {
                set('language', l.code);
                if (applyLanguage(l.code)) setNeedsRestart(true);
              }}
              right={language === l.code ? <Icon name="checkmark-circle" color={theme.colors.primary} /> : <></>}
            />
          </Fragment>
        ))}
      </Card>
      <Notice>{t('onboarding.languageNote')}</Notice>
    </Screen>
  );
}
