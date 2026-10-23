import type { CalculationMethodId } from './types';

export interface MethodInfo {
  id: CalculationMethodId;
  /** English label; method names are proper nouns and are not translated. */
  label: string;
  region: string;
  /** Fajr/Isha parameters as implemented by the adhan library, shown for transparency. */
  detail: string;
}

export const CALCULATION_METHODS: readonly MethodInfo[] = [
  { id: 'Karachi', label: 'University of Islamic Sciences, Karachi', region: 'Pakistan, India, Bangladesh, Afghanistan', detail: 'Fajr 18°, Isha 18°' },
  { id: 'MuslimWorldLeague', label: 'Muslim World League', region: 'Europe, Far East, parts of the Americas', detail: 'Fajr 18°, Isha 17°' },
  { id: 'Egyptian', label: 'Egyptian General Authority of Survey', region: 'Africa, Syria, Lebanon, Malaysia', detail: 'Fajr 19.5°, Isha 17.5°' },
  { id: 'UmmAlQura', label: 'Umm al-Qura University, Makkah', region: 'Arabian Peninsula', detail: 'Fajr 18.5°, Isha 90 min after Maghrib (many authorities use 120 min in Ramadan — adjust manually)' },
  { id: 'NorthAmerica', label: 'ISNA (Islamic Society of North America)', region: 'North America', detail: 'Fajr 15°, Isha 15°' },
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee Worldwide', region: 'North America, UK', detail: 'Fajr 18°, Isha 18°, seasonal adjustments' },
  { id: 'Dubai', label: 'Dubai', region: 'United Arab Emirates', detail: 'Fajr 18.2°, Isha 18.2°' },
  { id: 'Kuwait', label: 'Kuwait', region: 'Kuwait', detail: 'Fajr 18°, Isha 17.5°' },
  { id: 'Qatar', label: 'Qatar', region: 'Qatar', detail: 'Fajr 18°, Isha 90 min after Maghrib' },
  { id: 'Singapore', label: 'Majlis Ugama Islam Singapura', region: 'Singapore, Malaysia, Indonesia', detail: 'Fajr 20°, Isha 18°' },
  { id: 'Turkey', label: 'Diyanet İşleri Başkanlığı', region: 'Turkey', detail: 'Fajr 18°, Isha 17°' },
  { id: 'Tehran', label: 'Institute of Geophysics, University of Tehran', region: 'Iran', detail: 'Fajr 17.7°, Isha 14°, Maghrib 4.5°' },
];

/**
 * A *suggestion* shown during setup based on country. The user always confirms the
 * method; we never assume all Muslims in a region follow the same authority.
 */
export function suggestMethodForCountry(iso2: string | null | undefined): CalculationMethodId {
  switch ((iso2 ?? '').toUpperCase()) {
    case 'IN': case 'PK': case 'BD': case 'AF': case 'LK': case 'NP':
      return 'Karachi';
    case 'SA': case 'YE': case 'OM': case 'BH':
      return 'UmmAlQura';
    case 'AE':
      return 'Dubai';
    case 'KW':
      return 'Kuwait';
    case 'QA':
      return 'Qatar';
    case 'EG': case 'SY': case 'LB': case 'SD': case 'LY': case 'DZ': case 'MA': case 'TN': case 'IQ': case 'JO': case 'PS':
      return 'Egyptian';
    case 'US': case 'CA':
      return 'NorthAmerica';
    case 'SG': case 'MY': case 'ID': case 'BN':
      return 'Singapore';
    case 'TR':
      return 'Turkey';
    case 'IR':
      return 'Tehran';
    default:
      return 'MuslimWorldLeague';
  }
}
