import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { AppText, Button, Card, EmptyState, Notice, Screen } from '@/components/ui';
import { angleDelta, distanceToKaabaKm, headingQuality, qiblaBearing, type HeadingQuality } from '@/features/qibla/qibla';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

type HeadingState =
  | { status: 'starting' }
  | { status: 'no-permission' }
  | { status: 'unavailable' }
  | { status: 'ok'; trueHeading: number; quality: HeadingQuality };

/** Live true-north heading. Reports "unavailable" rather than guessing. */
function useTrueHeading(): HeadingState {
  const [state, setState] = useState<HeadingState>({ status: 'starting' });
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    let received = false;
    // Devices without a magnetometer may never emit a heading (and never throw).
    const timeout = setTimeout(() => {
      if (!received && !cancelled) setState({ status: 'unavailable' });
    }, 5000);
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (perm.status !== 'granted') return setState({ status: 'no-permission' });
      try {
        sub = await Location.watchHeadingAsync((h) => {
          received = true;
          const quality = headingQuality(h.accuracy, Platform.OS);
          // trueHeading is -1 when the platform cannot resolve true north.
          if (h.trueHeading == null || h.trueHeading < 0 || quality === 'unavailable') setState({ status: 'unavailable' });
          else setState({ status: 'ok', trueHeading: h.trueHeading, quality });
        });
      } catch {
        setState({ status: 'unavailable' });
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub?.remove();
    };
  }, []);
  return state;
}

export default function QiblaScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const location = useSettings((s) => s.location);
  const heading = useTrueHeading();

  if (!location) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: t('qibla.title') }} />
        <EmptyState icon="location-outline" title={t('qibla.needsLocation')} action={<Button title={t('home.setLocationAction')} onPress={() => router.push('/location')} />} />
      </Screen>
    );
  }

  const bearing = qiblaBearing(location.latitude, location.longitude);
  const km = Math.round(distanceToKaabaKm(location.latitude, location.longitude));
  const size = Math.min(width - 48, 320);
  const live = heading.status === 'ok';
  const rotation = live ? -heading.trueHeading : 0;
  const delta = live ? angleDelta(heading.trueHeading, bearing) : 0;
  const aligned = live && Math.abs(delta) <= 3;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('qibla.title') }} />
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <AppText variant="display" tone={aligned ? 'primary' : 'default'}>
          {bearing.toFixed(1)}°
        </AppText>
        <AppText tone="muted">{t('qibla.bearing', { deg: bearing.toFixed(1) })}</AppText>

        {live ? (
          <>
            <Compass size={size} rotation={rotation} bearing={bearing} aligned={aligned} />
            <AppText variant="heading" tone={aligned ? 'primary' : 'default'}>
              {aligned ? t('qibla.facing') : delta < 0 ? t('qibla.turnLeft', { deg: Math.abs(Math.round(delta)) }) : t('qibla.turnRight', { deg: Math.round(delta) })}
            </AppText>
            <AppText variant="caption" tone={heading.quality === 'poor' ? 'danger' : 'muted'}>
              {t(`qibla.accuracy.${heading.quality}`)}
            </AppText>
          </>
        ) : heading.status === 'starting' ? (
          <AppText tone="muted">{t('common.loading')}</AppText>
        ) : (
          <EmptyState
            icon="compass-outline"
            title={t('qibla.unavailable')}
            body={heading.status === 'no-permission' ? t('qibla.permissionNeeded') : t('qibla.unavailableBody')}
          />
        )}
        <AppText variant="caption" tone="muted">
          {location.name} · {t('qibla.distance', { km: km.toLocaleString() })}
        </AppText>
      </Card>
      <Notice icon="sync-outline">
        <AppText variant="bodyStrong">{t('qibla.calibrate')}</AppText>
        <AppText variant="caption">{t('qibla.calibrateBody')}</AppText>
      </Notice>
      <Notice tone="warning">{t('qibla.sensorNote')}</Notice>
      <View style={{ height: 1, backgroundColor: theme.colors.background }} />
    </Screen>
  );
}

function Compass({ size, rotation, bearing, aligned }: { size: number; rotation: number; bearing: number; aligned: boolean }) {
  const theme = useTheme();
  const c = size / 2;
  const r = c - 12;
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  return (
    <View accessible accessibilityLabel={`Compass. Qibla at ${bearing.toFixed(0)} degrees`} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={rotation} origin={`${c}, ${c}`}>
          <Circle cx={c} cy={c} r={r} stroke={theme.colors.border} strokeWidth={2} fill={theme.colors.surfaceAlt} />
          {ticks.map((d) => {
            const long = d % 30 === 0;
            const rad = (d * Math.PI) / 180;
            const x1 = c + Math.sin(rad) * r;
            const y1 = c - Math.cos(rad) * r;
            const x2 = c + Math.sin(rad) * (r - (long ? 14 : 7));
            const y2 = c - Math.cos(rad) * (r - (long ? 14 : 7));
            return <Line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.colors.textMuted} strokeWidth={long ? 2 : 1} />;
          })}
          {(['N', 'E', 'S', 'W'] as const).map((l, i) => {
            const rad = (i * 90 * Math.PI) / 180;
            return (
              <SvgText key={l} x={c + Math.sin(rad) * (r - 30)} y={c - Math.cos(rad) * (r - 30) + 6} fontSize={16} fontWeight="bold" fill={l === 'N' ? theme.colors.danger : theme.colors.text} textAnchor="middle">
                {l}
              </SvgText>
            );
          })}
          <G rotation={bearing} origin={`${c}, ${c}`}>
            <Line x1={c} y1={c} x2={c} y2={c - r + 26} stroke={aligned ? theme.colors.primary : theme.colors.gold} strokeWidth={5} strokeLinecap="round" />
            <Path d={`M ${c - 12} ${c - r + 40} L ${c} ${c - r + 18} L ${c + 12} ${c - r + 40} Z`} fill={aligned ? theme.colors.primary : theme.colors.gold} />
          </G>
          <Circle cx={c} cy={c} r={6} fill={theme.colors.text} />
        </G>
        {/* Fixed marker: the top of the phone. */}
        <Path d={`M ${c - 9} 2 L ${c} 16 L ${c + 9} 2 Z`} fill={theme.colors.primary} />
      </Svg>
    </View>
  );
}
