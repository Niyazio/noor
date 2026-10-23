import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';

import brand from '@/config/brand.json';
import en from './locales/en';
import { ar, hi, kn, ml, ta, ur } from './locales/others';
import { isRtl, isSupportedLanguage, type LanguageCode } from './languages';

export function detectDeviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    const code = locale.languageCode ?? '';
    if (isSupportedLanguage(code)) return code;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    ur: { translation: ur },
    hi: { translation: hi },
    kn: { translation: kn },
    ml: { translation: ml },
    ta: { translation: ta },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false, defaultVariables: { app: brand.appName } },
  returnNull: false,
});

/**
 * Applies the language. Returns true if the layout direction changed, which only takes
 * effect after the app restarts (a React Native limitation).
 */
export function applyLanguage(code: LanguageCode): boolean {
  if (i18n.language !== code) i18n.changeLanguage(code);
  const rtl = isRtl(code);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    return true;
  }
  return false;
}

export default i18n;
