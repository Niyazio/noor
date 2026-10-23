export type LocationSource = 'gps' | 'city' | 'manual';

export interface SavedLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  name: string;
  region?: string;
  country?: string; // ISO 3166-1 alpha-2 where known
  source: LocationSource;
  updatedAt: number;
}
