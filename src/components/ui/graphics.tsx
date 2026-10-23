import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

/** Subtle eight-point star lattice, used sparingly behind hero cards. */
export function GeometricPattern({ color, opacity = 1 }: { color?: string; opacity?: number }) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.pattern;
  // An eight-point star (two overlapping squares) tiled on a 48px grid.
  const star = 'M24 6 L29.3 18.7 L42 24 L29.3 29.3 L24 42 L18.7 29.3 L6 24 L18.7 18.7 Z';
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} opacity={opacity} pointerEvents="none">
      <Defs>
        <Pattern id="stars" width="48" height="48" patternUnits="userSpaceOnUse">
          <Path d={star} stroke={stroke} strokeWidth={1} fill="none" />
          <Rect x="11.3" y="11.3" width="25.4" height="25.4" stroke={stroke} strokeWidth={1} fill="none" transform="rotate(45 24 24)" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stars)" />
    </Svg>
  );
}

export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[{ borderRadius: theme.radius.xl, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[theme.colors.heroFrom, theme.colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GeometricPattern color="rgba(201,162,74,0.18)" />
      <View style={{ padding: 20 }}>{children}</View>
    </View>
  );
}

export function ProgressRing({
  size,
  stroke = 10,
  progress,
  color,
  track,
  children,
}: {
  size: number;
  stroke?: number;
  progress: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? theme.colors.surfaceAlt} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color ?? theme.colors.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
            fill="none"
          />
        </G>
      </Svg>
      {children}
    </View>
  );
}
