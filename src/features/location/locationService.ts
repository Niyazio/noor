import * as Location from 'expo-location';

import type { SqlDb } from '@/db/types';
import { normalizeLatin } from '@/features/quran/normalize';
import { deviceTimeZone } from '@/lib/time';
import type { SavedLocation } from './types';

export type GpsResult =
  | { ok: true; location: SavedLocation }
  | { ok: false; reason: 'denied' | 'services-off' | 'failed' };

/**
 * One-shot foreground location. Coordinates stay on the device. The time zone is the
 * device's, which is correct for "where I am now".
 */
export async function locateWithGps(): Promise<GpsResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return { ok: false, reason: 'denied' };
  if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'services-off' };
  try {
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 5000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = pos.coords;
    let name = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
    let region: string | undefined;
    let country: string | undefined;
    try {
      // Uses the platform geocoder; may need network. Failure only affects the label.
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        name = place.city ?? place.subregion ?? place.district ?? name;
        region = place.region ?? undefined;
        country = place.isoCountryCode ?? undefined;
      }
    } catch {
      // keep coordinate label
    }
    return {
      ok: true,
      location: { latitude, longitude, timezone: deviceTimeZone(), name, region, country, source: 'gps', updatedAt: Date.now() },
    };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export interface CityRow {
  id: number;
  name: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  population: number;
}

export async function searchCities(db: SqlDb, query: string, limit = 40): Promise<CityRow[]> {
  const q = normalizeLatin(query);
  if (q.length < 2) return [];
  const esc = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  return db.getAllAsync<CityRow>(
    `SELECT id, name, province, country, lat, lng, timezone, population FROM cities
     WHERE name_search LIKE ? ESCAPE '\\' OR name_search LIKE ? ESCAPE '\\'
     ORDER BY (name_search LIKE ? ESCAPE '\\') DESC, population DESC LIMIT ?`,
    `${esc}%`, `% ${esc}%`, `${esc}%`, limit,
  );
}

export function cityToLocation(c: CityRow): SavedLocation {
  return {
    latitude: c.lat,
    longitude: c.lng,
    timezone: c.timezone,
    name: c.name,
    region: c.province || undefined,
    country: c.country,
    source: 'city',
    updatedAt: Date.now(),
  };
}
