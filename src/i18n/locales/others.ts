/**
 * Partial UI translations. Missing keys fall back to English.
 * STATUS: draft — every string here needs review by a native speaker before release
 * (tracked in docs/LOCALIZATION.md). Religious text is never translated here.
 */
import type { TranslationResources } from './en';

type Partial2<T> = { [K in keyof T]?: T[K] extends string ? string : Partial2<T[K]> };
type Dict = Partial2<TranslationResources>;

export const ar: Dict = {
  common: { cancel: 'إلغاء', save: 'حفظ', done: 'تم', continue: 'متابعة', back: 'رجوع', retry: 'إعادة المحاولة', search: 'بحث', share: 'مشاركة', copy: 'نسخ', copied: 'تم النسخ', loading: 'جارٍ التحميل…', skip: 'تخطٍّ الآن', change: 'تغيير' },
  tabs: { home: 'الرئيسية', quran: 'القرآن', prayer: 'الصلاة', dhikr: 'الذكر', more: 'المزيد' },
  greeting: { night: 'ليلة هادئة', morning: 'صباح الخير', afternoon: 'مساء الخير', evening: 'مساء الخير', salam: 'السلام عليكم' },
  home: { nextPrayer: 'الصلاة القادمة', todaysPrayers: 'صلوات اليوم', continueReading: 'متابعة القراءة', ayahOfDay: 'آية اليوم', quickAccess: 'وصول سريع', tasbeeh: 'التسبيح', qibla: 'القبلة', calendar: 'التقويم', bookmarks: 'العلامات' },
  prayer: { title: 'مواقيت الصلاة', names: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }, method: 'طريقة الحساب', today: 'اليوم' },
  quran: { title: 'القرآن', surahs: 'السور', juz: 'الأجزاء', bookmarks: 'العلامات', meccan: 'مكية', medinan: 'مدنية' },
  dhikr: { title: 'الذكر', undo: 'تراجع', target: 'الهدف' },
  qibla: { title: 'القبلة' },
  more: { title: 'المزيد', settings: 'الإعدادات', language: 'اللغة', appearance: 'المظهر' },
};

export const ur: Dict = {
  common: { cancel: 'منسوخ کریں', save: 'محفوظ کریں', done: 'ہو گیا', continue: 'جاری رکھیں', back: 'واپس', search: 'تلاش', share: 'شیئر کریں', copy: 'کاپی', loading: 'لوڈ ہو رہا ہے…' },
  tabs: { home: 'ہوم', quran: 'قرآن', prayer: 'نماز', dhikr: 'ذکر', more: 'مزید' },
  greeting: { salam: 'السلام علیکم', morning: 'صبح بخیر', evening: 'شام بخیر' },
  home: { nextPrayer: 'اگلی نماز', todaysPrayers: 'آج کی نمازیں', continueReading: 'تلاوت جاری رکھیں', ayahOfDay: 'آج کی آیت', quickAccess: 'فوری رسائی', tasbeeh: 'تسبیح', qibla: 'قبلہ' },
  prayer: { title: 'اوقاتِ نماز', names: { fajr: 'فجر', sunrise: 'طلوعِ آفتاب', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' }, method: 'حساب کا طریقہ', today: 'آج' },
  quran: { title: 'قرآن', surahs: 'سورتیں', juz: 'پارے', bookmarks: 'بُک مارکس', meccan: 'مکی', medinan: 'مدنی' },
  dhikr: { title: 'ذکر' },
  qibla: { title: 'قبلہ' },
  more: { title: 'مزید', settings: 'ترتیبات', language: 'زبان' },
};

export const hi: Dict = {
  common: { cancel: 'रद्द करें', save: 'सहेजें', done: 'हो गया', continue: 'जारी रखें', back: 'वापस', search: 'खोजें', share: 'साझा करें', copy: 'कॉपी', loading: 'लोड हो रहा है…' },
  tabs: { home: 'होम', quran: 'क़ुरआन', prayer: 'नमाज़', dhikr: 'ज़िक्र', more: 'और' },
  greeting: { salam: 'अस्सलामु अलैकुम', morning: 'सुप्रभात', evening: 'शुभ संध्या' },
  home: { nextPrayer: 'अगली नमाज़', todaysPrayers: 'आज की नमाज़ें', continueReading: 'पढ़ना जारी रखें', ayahOfDay: 'आज की आयत', quickAccess: 'त्वरित पहुँच', tasbeeh: 'तस्बीह', qibla: 'क़िबला' },
  prayer: { title: 'नमाज़ के समय', names: { fajr: 'फ़ज्र', sunrise: 'सूर्योदय', dhuhr: 'ज़ुहर', asr: 'अस्र', maghrib: 'मग़रिब', isha: 'इशा' }, today: 'आज' },
  quran: { title: 'क़ुरआन', surahs: 'सूरह', juz: 'पारा', bookmarks: 'बुकमार्क', meccan: 'मक्की', medinan: 'मदनी' },
  more: { title: 'और', settings: 'सेटिंग्स', language: 'भाषा' },
};

export const kn: Dict = {
  common: { cancel: 'ರದ್ದುಮಾಡಿ', save: 'ಉಳಿಸಿ', done: 'ಮುಗಿದಿದೆ', continue: 'ಮುಂದುವರಿಸಿ', back: 'ಹಿಂದೆ', search: 'ಹುಡುಕಿ' },
  tabs: { home: 'ಮುಖಪುಟ', quran: 'ಕುರ್‌ಆನ್', prayer: 'ನಮಾಜ್', dhikr: 'ದಿಕ್ರ್', more: 'ಇನ್ನಷ್ಟು' },
  greeting: { salam: 'ಅಸ್ಸಲಾಮು ಅಲೈಕುಮ್' },
  home: { nextPrayer: 'ಮುಂದಿನ ನಮಾಜ್', todaysPrayers: 'ಇಂದಿನ ನಮಾಜ್‌ಗಳು', continueReading: 'ಓದು ಮುಂದುವರಿಸಿ', tasbeeh: 'ತಸ್ಬೀಹ್', qibla: 'ಕಿಬ್ಲಾ' },
  prayer: { title: 'ನಮಾಜ್ ಸಮಯ', names: { fajr: 'ಫಜ್ರ್', sunrise: 'ಸೂರ್ಯೋದಯ', dhuhr: 'ಝುಹರ್', asr: 'ಅಸರ್', maghrib: 'ಮಗ್ರಿಬ್', isha: 'ಇಶಾ' }, today: 'ಇಂದು' },
  quran: { title: 'ಕುರ್‌ಆನ್', surahs: 'ಸೂರಾಗಳು', juz: 'ಜುಝ್' },
  more: { title: 'ಇನ್ನಷ್ಟು', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', language: 'ಭಾಷೆ' },
};

export const ml: Dict = {
  common: { cancel: 'റദ്ദാക്കുക', save: 'സേവ് ചെയ്യുക', done: 'പൂർത്തിയായി', continue: 'തുടരുക', back: 'തിരികെ', search: 'തിരയുക' },
  tabs: { home: 'ഹോം', quran: 'ഖുർആൻ', prayer: 'നമസ്കാരം', dhikr: 'ദിക്ർ', more: 'കൂടുതൽ' },
  greeting: { salam: 'അസ്സലാമു അലൈക്കും' },
  home: { nextPrayer: 'അടുത്ത നമസ്കാരം', todaysPrayers: 'ഇന്നത്തെ നമസ്കാരങ്ങൾ', continueReading: 'പാരായണം തുടരുക', tasbeeh: 'തസ്ബീഹ്', qibla: 'ഖിബ്‌ല' },
  prayer: { title: 'നമസ്കാര സമയം', names: { fajr: 'സുബ്ഹ്', sunrise: 'സൂര്യോദയം', dhuhr: 'ളുഹ്ർ', asr: 'അസ്ർ', maghrib: 'മഗ്‌രിബ്', isha: 'ഇശാ' }, today: 'ഇന്ന്' },
  quran: { title: 'ഖുർആൻ', surahs: 'സൂറത്തുകൾ', juz: 'ജുസ്‌ഉ' },
  more: { title: 'കൂടുതൽ', settings: 'ക്രമീകരണങ്ങൾ', language: 'ഭാഷ' },
};

export const ta: Dict = {
  common: { cancel: 'ரத்து', save: 'சேமி', done: 'முடிந்தது', continue: 'தொடர்க', back: 'பின்', search: 'தேடு' },
  tabs: { home: 'முகப்பு', quran: 'குர்ஆன்', prayer: 'தொழுகை', dhikr: 'திக்ர்', more: 'மேலும்' },
  greeting: { salam: 'அஸ்ஸலாமு அலைக்கும்' },
  home: { nextPrayer: 'அடுத்த தொழுகை', todaysPrayers: 'இன்றைய தொழுகைகள்', continueReading: 'தொடர்ந்து ஓதுக', tasbeeh: 'தஸ்பீஹ்', qibla: 'கிப்லா' },
  prayer: { title: 'தொழுகை நேரங்கள்', names: { fajr: 'ஃபஜ்ர்', sunrise: 'சூரிய உதயம்', dhuhr: 'லுஹர்', asr: 'அஸர்', maghrib: 'மஃரிப்', isha: 'இஷா' }, today: 'இன்று' },
  quran: { title: 'குர்ஆன்', surahs: 'சூராக்கள்', juz: 'ஜுஸ்உ' },
  more: { title: 'மேலும்', settings: 'அமைப்புகள்', language: 'மொழி' },
};
