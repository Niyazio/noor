import brand from '@/config/brand.json';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DarkStyle = 'navy' | 'amoled';
/** App colour theme. Each has light and dark variants. */
export type Accent = 'emerald' | 'lavender' | 'sand' | 'neutral';

export const ACCENTS: readonly Accent[] = ['emerald', 'lavender', 'sand', 'neutral'];

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
  accent: Accent;
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

type Palette = Omit<ThemeColors, 'danger' | 'success' | 'onHero' | 'onHeroMuted' | 'textInverse'>;

const LIGHT: Record<Accent, Palette> = {
  emerald: {
    background: brand.colors.ivory, surface: '#FFFFFF', surfaceAlt: '#F2ECDD', border: '#E6DFCD',
    text: '#14212B', textMuted: '#5B6670', primary: brand.colors.emerald, primarySoft: '#E1EFE9', onPrimary: '#FFFFFF',
    gold: '#A9842F', goldSoft: '#F4EAD2', heroFrom: '#0F5E4A', heroTo: brand.colors.navy, tabBar: '#FFFFFF',
    pattern: 'rgba(201,162,74,0.16)',
  },
  lavender: {
    background: '#F7F3FE', surface: '#FFFFFF', surfaceAlt: '#EEE7FB', border: '#E3D9F6',
    text: '#21173D', textMuted: '#6D6489', primary: '#7445D9', primarySoft: '#EFE7FE', onPrimary: '#FFFFFF',
    gold: '#D9875A', goldSoft: '#FCEBDF', heroFrom: '#A673F2', heroTo: '#6A3FD0', tabBar: '#FFFFFF',
    pattern: 'rgba(255,255,255,0.18)',
  },
  sand: {
    background: '#F7F0E1', surface: '#FFFCF5', surfaceAlt: '#EFE4CB', border: '#E1D2B0',
    text: '#2B2014', textMuted: '#7A6A55', primary: '#8A5A1F', primarySoft: '#F3E6CB', onPrimary: '#FFFFFF',
    gold: '#A87B26', goldSoft: '#F3E3C0', heroFrom: '#9C6B2E', heroTo: '#4A3216', tabBar: '#FFFCF5',
    pattern: 'rgba(255,236,190,0.20)',
  },
  neutral: {
    background: '#F5F6F7', surface: '#FFFFFF', surfaceAlt: '#EBEDF0', border: '#DEE1E5',
    text: '#161A1F', textMuted: '#5F6770', primary: '#2F3A45', primarySoft: '#E7E9EC', onPrimary: '#FFFFFF',
    gold: '#A9842F', goldSoft: '#F4EAD2', heroFrom: '#3A4653', heroTo: '#151A20', tabBar: '#FFFFFF',
    pattern: 'rgba(255,255,255,0.12)',
  },
};

const DARK: Record<Accent, Palette> = {
  emerald: {
    background: brand.colors.navy, surface: '#12263A', surfaceAlt: '#183048', border: '#20384F',
    text: '#EEF2F5', textMuted: '#9AA8B5', primary: '#3FB58F', primarySoft: '#123A31', onPrimary: '#04150F',
    gold: brand.colors.gold, goldSoft: '#2A2817', heroFrom: '#0F4A3B', heroTo: '#0A1622', tabBar: '#0E2133',
    pattern: 'rgba(201,162,74,0.10)',
  },
  lavender: {
    background: '#140F24', surface: '#1E1735', surfaceAlt: '#271E44', border: '#342857',
    text: '#F1EDFB', textMuted: '#A99FC6', primary: '#B49BFF', primarySoft: '#2C2350', onPrimary: '#160C33',
    gold: '#F0A97E', goldSoft: '#3A2620', heroFrom: '#5B3BB0', heroTo: '#1C1335', tabBar: '#18122B',
    pattern: 'rgba(255,255,255,0.08)',
  },
  sand: {
    background: '#19140D', surface: '#241D14', surfaceAlt: '#2F261A', border: '#3C3122',
    text: '#F3EADB', textMuted: '#B3A388', primary: '#D9B26B', primarySoft: '#3A2F1D', onPrimary: '#1E1608',
    gold: '#D9B26B', goldSoft: '#3A2F1D', heroFrom: '#6B4A1F', heroTo: '#19140D', tabBar: '#1F1911',
    pattern: 'rgba(217,178,107,0.10)',
  },
  neutral: {
    background: '#111417', surface: '#1A1E23', surfaceAlt: '#22272D', border: '#2D333A',
    text: '#EEF0F2', textMuted: '#9AA1A9', primary: '#C9D1DA', primarySoft: '#252C34', onPrimary: '#111417',
    gold: brand.colors.gold, goldSoft: '#2A2817', heroFrom: '#2A323B', heroTo: '#111417', tabBar: '#15191D',
    pattern: 'rgba(255,255,255,0.06)',
  },
};

export function buildTheme(scheme: 'light' | 'dark', darkStyle: DarkStyle, accent: Accent): Theme {
  const key: Accent = (ACCENTS as readonly string[]).includes(accent) ? accent : 'emerald';
  if (scheme === 'light') {
    return {
      dark: false, accent: key, spacing, radius, fonts,
      colors: {
        ...LIGHT[key], textInverse: '#FFFFFF', danger: '#B3261E', success: '#2E7D4F',
        onHero: '#FFFFFF', onHeroMuted: 'rgba(255,255,255,0.78)',
      },
    };
  }
  const p = DARK[key];
  const amoled = darkStyle === 'amoled';
  return {
    dark: true, accent: key, spacing, radius, fonts,
    colors: {
      ...p,
      background: amoled ? '#000000' : p.background,
      surface: amoled ? '#0B0B0B' : p.surface,
      surfaceAlt: amoled ? '#151515' : p.surfaceAlt,
      border: amoled ? '#1F1F1F' : p.border,
      tabBar: amoled ? '#000000' : p.tabBar,
      heroTo: amoled ? '#000000' : p.heroTo,
      textInverse: p.background, danger: '#F2B8B5', success: '#7FD3A5',
      onHero: '#FFFFFF', onHeroMuted: 'rgba(255,255,255,0.72)',
    },
  };
}

// ---------------------------------------------------------------------------
// Reading themes: the page the Quran is printed on.
// ---------------------------------------------------------------------------
export type ReadingThemeId = 'auto' | 'mushaf' | 'emerald' | 'lavender' | 'night';
export const READING_THEMES: readonly Exclude<ReadingThemeId, 'auto'>[] = ['mushaf', 'emerald', 'lavender', 'night'];

export interface ReadingTheme {
  id: Exclude<ReadingThemeId, 'auto'>;
  dark: boolean;
  /** Screen behind the page. */
  canvas: string;
  /** The paper. */
  page: string;
  ink: string;
  inkMuted: string;
  /** Outer and inner frame lines of the page. */
  frame: string;
  frameInner: string;
  /** Ayah marker and ornament colour. */
  ornament: string;
  /** Background of the selected / currently recited ayah. */
  highlight: string;
  /** Surah title banner. */
  bannerBg: string;
  bannerInk: string;
  chipBg: string;
  chipInk: string;
}

export const READING_THEME_DEFS: Record<Exclude<ReadingThemeId, 'auto'>, ReadingTheme> = {
  mushaf: {
    id: 'mushaf', dark: false, canvas: '#E9DFC4', page: '#FCF6E3', ink: '#1A1712', inkMuted: '#6E6550',
    frame: '#2F6B4F', frameInner: '#C9A24A', ornament: '#8A6A1F', highlight: 'rgba(201,162,74,0.30)',
    bannerBg: '#EFE3BF', bannerInk: '#2F6B4F', chipBg: '#F6EDD2', chipInk: '#2F6B4F',
  },
  emerald: {
    id: 'emerald', dark: false, canvas: '#D9EBE1', page: '#F3FAF6', ink: '#0F2A20', inkMuted: '#4F6B60',
    frame: '#0F5E4A', frameInner: '#7FB89F', ornament: '#0F5E4A', highlight: 'rgba(15,94,74,0.16)',
    bannerBg: '#DCEFE5', bannerInk: '#0F5E4A', chipBg: '#E4F2EB', chipInk: '#0F5E4A',
  },
  lavender: {
    id: 'lavender', dark: false, canvas: '#EDE5FB', page: '#FFFFFF', ink: '#23183F', inkMuted: '#6D6489',
    frame: '#8B5CF6', frameInner: '#D6C6FB', ornament: '#7445D9', highlight: 'rgba(139,92,246,0.16)',
    bannerBg: '#F1E9FE', bannerInk: '#6A3FD0', chipBg: '#F1E9FE', chipInk: '#6A3FD0',
  },
  night: {
    id: 'night', dark: true, canvas: '#070D13', page: '#0F1A24', ink: '#ECE4CE', inkMuted: '#9C9583',
    frame: '#3D5A4C', frameInner: '#8A7238', ornament: '#C9A24A', highlight: 'rgba(201,162,74,0.22)',
    bannerBg: '#16232F', bannerInk: '#C9A24A', chipBg: '#16232F', chipInk: '#C9A24A',
  },
};

export function resolveReadingTheme(id: ReadingThemeId, app: Theme): ReadingTheme {
  if (id !== 'auto') return READING_THEME_DEFS[id];
  if (app.dark) return READING_THEME_DEFS.night;
  return app.accent === 'lavender' ? READING_THEME_DEFS.lavender : READING_THEME_DEFS.mushaf;
}
