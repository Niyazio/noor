import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'overline';
type Tone = 'default' | 'muted' | 'primary' | 'gold' | 'danger' | 'onHero' | 'onHeroMuted' | 'onPrimary';

const SIZES: Record<Variant, { size: number; lineHeight: number; weight: 'ui' | 'uiMedium' | 'uiSemiBold' | 'uiBold'; letterSpacing?: number }> = {
  display: { size: 34, lineHeight: 40, weight: 'uiBold', letterSpacing: -0.5 },
  title: { size: 24, lineHeight: 30, weight: 'uiBold', letterSpacing: -0.3 },
  heading: { size: 18, lineHeight: 24, weight: 'uiSemiBold' },
  body: { size: 15, lineHeight: 22, weight: 'ui' },
  bodyStrong: { size: 15, lineHeight: 22, weight: 'uiSemiBold' },
  caption: { size: 13, lineHeight: 18, weight: 'ui' },
  label: { size: 13, lineHeight: 18, weight: 'uiMedium' },
  overline: { size: 11, lineHeight: 14, weight: 'uiSemiBold', letterSpacing: 1.2 },
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', tone = 'default', align, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const v = SIZES[variant];
  const colors: Record<Tone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    gold: theme.colors.gold,
    danger: theme.colors.danger,
    onHero: theme.colors.onHero,
    onHeroMuted: theme.colors.onHeroMuted,
    onPrimary: theme.colors.onPrimary,
  };
  return (
    <RNText
      maxFontSizeMultiplier={1.8}
      {...rest}
      style={[
        {
          fontFamily: theme.fonts[v.weight],
          fontSize: v.size,
          lineHeight: v.lineHeight,
          letterSpacing: v.letterSpacing,
          color: colors[tone],
          textAlign: align,
          textTransform: variant === 'overline' ? 'uppercase' : undefined,
        },
        style,
      ]}
    />
  );
}

export const ARABIC_FONT_FAMILY = { amiri: 'AmiriQuran_400Regular', scheherazade: 'ScheherazadeNew_400Regular' } as const;

/** Quranic / Arabic text: always RTL, user-selected font and size, never altered. */
export function ArabicText({
  size,
  style,
  tone = 'default',
  ...rest
}: TextProps & { size?: number; tone?: Tone }) {
  const theme = useTheme();
  const font = useSettings((s) => s.reading.arabicFont);
  const defaultSize = useSettings((s) => s.reading.arabicSize);
  const lineHeight = useSettings((s) => s.reading.lineHeight);
  const fontSize = size ?? defaultSize;
  const color = tone === 'onHero' ? theme.colors.onHero : tone === 'muted' ? theme.colors.textMuted : theme.colors.text;
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        {
          fontFamily: ARABIC_FONT_FAMILY[font],
          fontSize,
          lineHeight: Math.round(fontSize * lineHeight),
          color,
          writingDirection: 'rtl',
          textAlign: 'right',
        },
        style,
      ]}
    />
  );
}
