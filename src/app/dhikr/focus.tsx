import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui';
import { CounterView } from '@/features/dhikr/CounterView';
import { useCounter } from '@/features/dhikr/useCounter';
import { useTheme } from '@/theme/ThemeProvider';

/** Full-screen, distraction-free counter. The whole screen is the tap target. */
export default function DhikrFocus() {
  useKeepAwake();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { counter, active, tap, undo } = useCounter();
  return (
    <Pressable onPress={tap} style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }} accessible={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} color={theme.colors.textMuted} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <CounterView counter={counter} active={active} onTap={tap} size={Math.min(width * 0.78, 340)} />
      </View>
      <View style={{ paddingHorizontal: 24 }}>
        <Button variant="secondary" icon="arrow-undo" title={t('dhikr.undo')} onPress={undo} disabled={!counter.undoStack.length} />
      </View>
    </Pressable>
  );
}
