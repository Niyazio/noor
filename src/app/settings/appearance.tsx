import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { AppText, Card, Screen, Segmented } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { ACCENTS, buildTheme } from '@/theme/themes';

export default function AppearanceSettings() {
  const { t } = useTranslation();
  const s = useSettings();
  const theme = useTheme();
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ACCENTS.map((a) => {
              const preview = buildTheme(theme.dark ? 'dark' : 'light', s.darkStyle, a);
              const selected = s.accent === a;
              return (
                <Pressable
                  key={a}
                  onPress={() => s.set('accent', a)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={{ width: 72, alignItems: 'center', gap: 6 }}
                >
                  <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', borderWidth: selected ? 3 : 1, borderColor: selected ? theme.colors.text : theme.colors.border }}>
                    <LinearGradient colors={[preview.colors.heroFrom, preview.colors.heroTo]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: preview.colors.background }} />
                    </LinearGradient>
                  </View>
                  <AppText variant="caption">{t(`appearance.${a}`)}</AppText>
                </Pressable>
              );
            })}
          </View>
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
