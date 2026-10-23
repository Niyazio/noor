import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { headingQuality, type HeadingQuality } from './qibla';

export type HeadingState =
  | { status: 'starting' }
  | { status: 'needs-permission'; request: () => void }
  | { status: 'no-permission' }
  | { status: 'unavailable' }
  | { status: 'ok'; trueHeading: number; quality: HeadingQuality };

/** Live heading relative to TRUE north (native: the OS applies declination). */
export function useHeading(_latitude: number, _longitude: number): HeadingState {
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
