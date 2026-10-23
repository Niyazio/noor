import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { headingQuality, magneticDeclination, magneticToTrue } from './qibla';
import type { HeadingState } from './useHeading';

export type { HeadingState } from './useHeading';

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Browser compass for the installable web app.
 * - iPhone/iPad Safari: `webkitCompassHeading` (magnetic), after the user grants motion access.
 * - Android Chrome: `deviceorientationabsolute` alpha (magnetic).
 * Magnetic headings are converted to true north with the World Magnetic Model. Desktop browsers
 * have no compass and report "unavailable" — never a guessed direction.
 */
export function useHeading(latitude: number, longitude: number): HeadingState {
  const declination = useMemo(() => magneticDeclination(latitude, longitude), [latitude, longitude]);
  const needsPermission =
    typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as unknown as PermissionApi).requestPermission === 'function';
  const [granted, setGranted] = useState(!needsPermission);
  const [state, setState] = useState<HeadingState>({ status: 'starting' });
  const received = useRef(false);

  const request = useCallback(() => {
    (DeviceOrientationEvent as unknown as PermissionApi).requestPermission!()
      .then((r) => (r === 'granted' ? setGranted(true) : setState({ status: 'no-permission' })))
      .catch(() => setState({ status: 'no-permission' }));
  }, []);

  useEffect(() => {
    if (!granted || typeof window === 'undefined' || declination == null) return;
    const absoluteEvent = 'ondeviceorientationabsolute' in window;
    const eventName = absoluteEvent ? 'deviceorientationabsolute' : 'deviceorientation';
    const onEvent = (raw: Event) => {
      const e = raw as OrientationEvent;
      let magnetic: number | null = null;
      let quality = headingQuality(null, 'web');
      if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
        magnetic = e.webkitCompassHeading;
        quality = headingQuality(e.webkitCompassAccuracy ?? -1, 'ios');
      } else if ((absoluteEvent || e.absolute) && e.alpha != null) {
        magnetic = (360 - e.alpha) % 360;
        quality = 'fair'; // Browsers expose no accuracy for this sensor.
      }
      if (magnetic == null) return;
      received.current = true;
      const screenAngle = (typeof screen !== 'undefined' && screen.orientation?.angle) || 0;
      setState({ status: 'ok', trueHeading: magneticToTrue(magnetic + screenAngle, declination), quality: quality === 'unavailable' ? 'fair' : quality });
    };
    window.addEventListener(eventName, onEvent);
    const timeout = setTimeout(() => {
      if (!received.current) setState({ status: 'unavailable' });
    }, 5000);
    return () => {
      window.removeEventListener(eventName, onEvent);
      clearTimeout(timeout);
    };
  }, [granted, declination]);

  // Without a valid magnetic model we cannot convert to true north, so show no live direction.
  if (declination == null) return { status: 'unavailable' };
  if (!granted && state.status !== 'no-permission') return { status: 'needs-permission', request };
  return state;
}
