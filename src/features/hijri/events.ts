/**
 * Recurring Islamic dates on the Hijri calendar. Labels for commemorations that not all
 * communities observe say so explicitly (see i18n `calendar.events`).
 */
export interface HijriEvent {
  month: number;
  day: number;
  key: string;
  kind: 'major' | 'fasting' | 'observance';
}

export const HIJRI_EVENTS: readonly HijriEvent[] = [
  { month: 1, day: 1, key: 'newYear', kind: 'observance' },
  { month: 1, day: 10, key: 'ashura', kind: 'fasting' },
  { month: 3, day: 12, key: 'mawlid', kind: 'observance' },
  { month: 7, day: 27, key: 'israMiraj', kind: 'observance' },
  { month: 8, day: 15, key: 'shabanMid', kind: 'observance' },
  { month: 9, day: 1, key: 'ramadanStart', kind: 'major' },
  { month: 9, day: 21, key: 'laylatulQadrNights', kind: 'major' },
  { month: 10, day: 1, key: 'eidFitr', kind: 'major' },
  { month: 12, day: 9, key: 'arafah', kind: 'fasting' },
  { month: 12, day: 10, key: 'eidAdha', kind: 'major' },
];
