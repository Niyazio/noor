import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, ArabicText, ProgressRing } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { roundProgress, type CounterState } from './counter';
import type { ActiveDhikr } from './useCounter';

/** Large tap target with progress ring. The whole area counts, for one-handed use. */
export function CounterView({ counter, active, onTap, size = 260 }: { counter: CounterState; active: ActiveDhikr; onTap: () => void; size?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reached = counter.target != null && counter.count > 0 && counter.count % counter.target === 0;
  return (
    <Pressable
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={`${active.title}. ${counter.count}${counter.target ? ` / ${counter.target}` : ''}`}
      accessibilityHint={t('dhikr.tapToCount')}
      style={{ alignItems: 'center', gap: 16, paddingVertical: 8 }}
    >
      {active.arabic ? (
        <ArabicText size={34} style={{ textAlign: 'center' }}>
          {active.arabic}
        </ArabicText>
      ) : null}
      <View style={{ alignItems: 'center' }}>
        <AppText variant="heading" align="center">
          {active.title}
        </AppText>
        {active.translation ? (
          <AppText variant="caption" tone="muted" align="center">
            {active.translation}
          </AppText>
        ) : null}
      </View>
      <ProgressRing size={size} stroke={14} progress={roundProgress(counter)} color={reached ? theme.colors.gold : theme.colors.primary}>
        <AppText style={{ fontFamily: theme.fonts.uiBold, fontSize: size * 0.28, lineHeight: size * 0.34, color: theme.colors.text, fontVariant: ['tabular-nums'] }}>
          {counter.target ? counter.count % counter.target || (counter.count ? counter.target : 0) : counter.count}
        </AppText>
        <AppText variant="label" tone={reached ? 'gold' : 'muted'}>
          {reached ? t('dhikr.completed') : counter.target ? `/ ${counter.target}` : t('dhikr.noTarget')}
        </AppText>
        {counter.rounds > 0 || (counter.target && counter.count > counter.target) ? (
          <AppText variant="caption" tone="muted">
            Σ {counter.count} · ×{counter.rounds}
          </AppText>
        ) : null}
      </ProgressRing>
      <AppText variant="caption" tone="muted">
        {t('dhikr.tapToCount')}
      </AppText>
    </Pressable>
  );
}
