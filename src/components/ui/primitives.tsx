import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './Text';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.colors.text} />;
}

/** Scrollable page with theme background and safe-area padding. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentStyle,
  ...rest
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
} & ScrollViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: edges.includes('top') ? insets.top + 8 : 8,
    paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + 32,
    paddingHorizontal: padded ? 16 : 0,
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: theme.colors.background }, padding, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[padding, { gap: 16 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 16,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <AppText variant="label" tone="primary">
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = { primary: theme.colors.primary, secondary: theme.colors.primarySoft, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: theme.colors.onPrimary, secondary: theme.colors.primary, ghost: theme.colors.primary, danger: theme.colors.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: variant === 'danger' ? 1 : 0,
          borderColor: theme.colors.danger,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant="bodyStrong" style={{ color: fg }}>
        {title}
      </AppText>
    </Pressable>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
  right,
  destructive,
  accessibilityHint,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <Icon name={icon} size={18} color={destructive ? theme.colors.danger : theme.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="body" tone={destructive ? 'danger' : 'default'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onValueChange, icon }: { title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void; icon?: IconName }) {
  const theme = useTheme();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      icon={icon}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          accessibilityLabel={title}
        />
      }
    />
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 2 }} />;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              paddingHorizontal: 6,
            }}
          >
            <AppText variant="label" tone={selected ? 'primary' : 'muted'} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: 14,
        minHeight: 36,
        justifyContent: 'center',
        borderRadius: theme.radius.pill,
        backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
      }}
    >
      <AppText variant="label" tone={selected ? 'onPrimary' : 'default'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, format }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  const theme = useTheme();
  const btn = (icon: IconName, next: number, label: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, Math.round(next * 100) / 100)))}
      disabled={next < min || next > max}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt }}
    >
      <Icon name={icon} size={18} color={theme.colors.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="adjustable" accessibilityValue={{ now: value, min, max }}>
      {btn('remove', value - step, 'Decrease')}
      <AppText variant="bodyStrong" style={{ minWidth: 44, textAlign: 'center' }}>
        {format ? format(value) : String(value)}
      </AppText>
      {btn('add', value + step, 'Increase')}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={theme.colors.primary} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" tone="muted" align="center">
          {body}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function Notice({ tone = 'info', icon, children }: { tone?: 'info' | 'warning'; icon?: IconName; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: theme.radius.md,
        backgroundColor: tone === 'warning' ? theme.colors.goldSoft : theme.colors.primarySoft,
      }}
    >
      <Icon name={icon ?? (tone === 'warning' ? 'alert-circle-outline' : 'information-circle-outline')} size={18} color={tone === 'warning' ? theme.colors.gold : theme.colors.primary} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <AppText variant="caption">{children}</AppText> : children}</View>
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 8 }: { height?: number; width?: number | `${number}%`; radius?: number }) {
  const theme = useTheme();
  return <View accessibilityElementsHidden style={{ height, width, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt }} />;
}

export function IconButton({ icon, onPress, label, color, size = 22 }: { icon: IconName; onPress: () => void; label: string; color?: string; size?: number } & Pick<PressableProps, 'disabled'>) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -6, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
