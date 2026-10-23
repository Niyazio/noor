import brand from '@/config/brand.json';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DarkStyle = 'navy' | 'amoled';
export type Accent = 'emerald' | 'neutral';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  gold: string;
  goldSoft: string;
  danger: string;
  success: string;
  heroFrom: string;
  heroTo: string;
  onHero: string;
  onHeroMuted: string;
  tabBar: string;
  pattern: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  fonts: {
    ui: string;
    uiMedium: string;
    uiSemiBold: string;
    uiBold: string;
  };
}

const spacing = (n: number) => n * 4;
const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };
const fonts = {
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemiBold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
};

const accents: Record<Accent, { light: string; lightSoft: string; dark: string; darkSoft: string }> = {
  emerald: { light: brand.colors.emerald, lightSoft: '#E1EFE9', dark: '#3FB58F', darkSoft: '#123A31' },
  neutral: { light: '#2F3A45', lightSoft: '#E7E9EC', dark: '#C9D1DA', darkSoft: '#252C34' },
};

export function buildTheme(scheme: 'light' | 'dark', darkStyle: DarkStyle, accent: Accent): Theme {
  const a = accents[accent];
  if (scheme === 'light') {
    return {
      dark: false,
      spacing,
      radius,
      fonts,
      colors: {
        background: brand.colors.ivory,
        surface: '#FFFFFF',
        surfaceAlt: '#F2ECDD',
        border: '#E6DFCD',
        text: '#14212B',
        textMuted: '#5B6670',
        textInverse: '#FFFFFF',
        primary: a.light,
        primarySoft: a.lightSoft,
        onPrimary: '#FFFFFF',
        gold: '#A9842F',
        goldSoft: '#F4EAD2',
        danger: '#B3261E',
        success: '#2E7D4F',
        heroFrom: accent === 'emerald' ? '#0F5E4A' : '#2F3A45',
        heroTo: brand.colors.navy,
        onHero: '#FFFFFF',
        onHeroMuted: 'rgba(255,255,255,0.74)',
        tabBar: '#FFFFFF',
        pattern: 'rgba(201,162,74,0.16)',
      },
    };
  }
  const amoled = darkStyle === 'amoled';
  return {
    dark: true,
    spacing,
    radius,
    fonts,
    colors: {
      background: amoled ? '#000000' : brand.colors.navy,
      surface: amoled ? '#0B0B0B' : '#12263A',
      surfaceAlt: amoled ? '#151515' : '#183048',
      border: amoled ? '#1F1F1F' : '#20384F',
      text: '#EEF2F5',
      textMuted: '#9AA8B5',
      textInverse: '#0B1B2B',
      primary: a.dark,
      primarySoft: amoled ? '#0F1F1A' : a.darkSoft,
      onPrimary: '#04150F',
      gold: brand.colors.gold,
      goldSoft: amoled ? '#1A150A' : '#2A2817',
      danger: '#F2B8B5',
      success: '#7FD3A5',
      heroFrom: amoled ? '#06231B' : '#0F4A3B',
      heroTo: amoled ? '#000000' : '#0A1622',
      onHero: '#FFFFFF',
      onHeroMuted: 'rgba(255,255,255,0.7)',
      tabBar: amoled ? '#000000' : '#0E2133',
      pattern: 'rgba(201,162,74,0.10)',
    },
  };
}
