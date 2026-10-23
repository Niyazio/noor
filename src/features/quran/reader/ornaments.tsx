import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { ArabicText } from '@/components/ui';
import { SURAHS } from '@/content/generated/surahs';
import { toArabicDigits } from '@/features/quran/repository';
import type { ReadingTheme } from '@/theme/themes';

/** Small eight-point star used at page corners and beside the surah title. */
export function Star({ size = 18, color, fill = 'none' }: { size?: number; color: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5" y="5" width="14" height="14" stroke={color} strokeWidth={1.6} fill={fill} />
      <Rect x="5" y="5" width="14" height="14" stroke={color} strokeWidth={1.6} fill={fill} transform="rotate(45 12 12)" />
      <Circle cx="12" cy="12" r="2.2" fill={color} />
    </Svg>
  );
}

/** Double-ruled page frame with corner stars, like a printed Mushaf. */
export function PageFrame({ rt, children }: { rt: ReadingTheme; children: React.ReactNode }) {
  return (
    <View style={{ borderWidth: 3, borderColor: rt.frame, borderRadius: 6, padding: 3, backgroundColor: rt.page }}>
      <View style={{ borderWidth: 1, borderColor: rt.frameInner, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 16, minHeight: 200 }}>
        {children}
      </View>
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <View
          key={c}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: c[0] === 't' ? -9 : undefined,
            bottom: c[0] === 'b' ? -9 : undefined,
            left: c[1] === 'l' ? -9 : undefined,
            right: c[1] === 'r' ? -9 : undefined,
            backgroundColor: rt.canvas,
            borderRadius: 10,
          }}
        >
          <Star size={18} color={rt.frameInner} fill={rt.page} />
        </View>
      ))}
    </View>
  );
}

/** Ornamental surah title band. The surah name comes from the Tanzil dataset. */
export function SurahBanner({ surah, rt }: { surah: number; rt: ReadingTheme }) {
  const info = SURAHS[surah - 1];
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel={`${info.nameTranslit}, ${info.ayahCount}`}
      style={{ marginVertical: 10, borderWidth: 1.5, borderColor: rt.frame, borderRadius: 4, backgroundColor: rt.bannerBg, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={[StyleSheet.absoluteFill, { margin: 3, borderWidth: 0.8, borderColor: rt.frameInner, borderRadius: 2 }]} pointerEvents="none" />
      <ArabicText size={14} style={{ color: rt.inkMuted, textAlign: 'left', width: 56 }}>
        {toArabicDigits(info.ayahCount)}
      </ArabicText>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Star size={14} color={rt.ornament} />
        <ArabicText size={24} style={{ color: rt.bannerInk, textAlign: 'center' }}>
          {info.nameAr}
        </ArabicText>
        <Star size={14} color={rt.ornament} />
      </View>
      <ArabicText size={14} style={{ color: rt.inkMuted, textAlign: 'right', width: 56 }}>
        {toArabicDigits(surah)}
      </ArabicText>
    </View>
  );
}
