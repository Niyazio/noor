import { Coordinates, Qibla } from 'adhan';

/** Coordinates of the Kaaba used by the adhan library's Qibla calculation. */
export const KAABA = { latitude: 21.4225241, longitude: 39.8261818 };

/**
 * Great-circle initial bearing from the location to the Kaaba, in degrees clockwise
 * from TRUE north (0–360).
 */
export function qiblaBearing(latitude: number, longitude: number): number {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Invalid coordinates');
  }
  return Qibla(new Coordinates(latitude, longitude));
}

/** Great-circle distance to the Kaaba in kilometres (haversine, mean Earth radius). */
export function distanceToKaabaKm(latitude: number, longitude: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(KAABA.latitude - latitude);
  const dLng = toRad(KAABA.longitude - longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(KAABA.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Signed smallest rotation (-180..180] from `heading` to `target`. */
export function angleDelta(heading: number, target: number): number {
  let d = ((target - heading) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

export type HeadingQuality = 'good' | 'fair' | 'poor' | 'unavailable';

/**
 * Normalises the platform heading accuracy. On iOS `accuracy` is an error estimate in
 * degrees (negative = invalid); on Android it is a 0–3 calibration level.
 */
export function headingQuality(accuracy: number | null | undefined, platform: 'ios' | 'android' | string): HeadingQuality {
  if (accuracy == null || Number.isNaN(accuracy)) return 'unavailable';
  if (platform === 'ios') {
    if (accuracy < 0) return 'unavailable';
    if (accuracy <= 15) return 'good';
    if (accuracy <= 30) return 'fair';
    return 'poor';
  }
  if (accuracy >= 3) return 'good';
  if (accuracy === 2) return 'fair';
  if (accuracy === 1) return 'poor';
  return 'unavailable';
}
