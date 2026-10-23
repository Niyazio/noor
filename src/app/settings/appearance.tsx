import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Card, Screen, Segmented } from '@/components/ui';
import { useSettings } from '@/store/settings';

export default function AppearanceSettings() {
  const { t } = useTranslation();
  const s = useSettings();
  const block = (label: string, control: React.ReactNode) => (
    <View style={{ gap: 8 }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      {control}
    </View>
  );
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('more.appearance') }} />
      <Card style={{ gap: 18 }}>
        {block(t('appearance.theme'), (
          <Segmented value={s.themeMode} onChange={(v) => s.set('themeMode', v)} options={[
            { value: 'system', label: t('appearance.system') },
            { value: 'light', label: t('appearance.light') },
            { value: 'dark', label: t('appearance.dark') },
          ]} />
        ))}
        {block(t('appearance.darkStyle'), (
          <Segmented value={s.darkStyle} onChange={(v) => s.set('darkStyle', v)} options={[
            { value: 'navy', label: t('appearance.navy') },
            { value: 'amoled', label: t('appearance.amoled') },
          ]} />
        ))}
        {block(t('appearance.accent'), (
          <Segmented value={s.accent} onChange={(v) => s.set('accent', v)} options={[
            { value: 'emerald', label: t('appearance.emerald') },
            { value: 'neutral', label: t('appearance.neutral') },
          ]} />
        ))}
        {block(t('appearance.timeFormat'), (
          <Segmented value={s.timeFormat} onChange={(v) => s.set('timeFormat', v)} options={[
            { value: '12h', label: t('appearance.h12') },
            { value: '24h', label: t('appearance.h24') },
          ]} />
        ))}
      </Card>
    </Screen>
  );
}
