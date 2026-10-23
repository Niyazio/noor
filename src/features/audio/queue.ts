import { SURAHS } from '@/content/generated/surahs';
import type { ReciterKind } from './reciters';

/**
 * Pure playback-queue logic (no audio APIs) so it can be unit-tested.
 */
export interface QueueState {
  kind: ReciterKind;
  surah: number;
  /** Current ayah (per-ayah reciters). 0 while the basmala intro plays. */
  ayah: number;
  /** True while the basmala that precedes a surah is playing (per-ayah reciters). */
  basmala: boolean;
  /** How many times the current ayah has been played so far (including the current play). */
  plays: number;
  /** Times to play each ayah; 0 = forever. */
  repeatAyah: number;
  continuous: boolean;
  /** Optional inclusive range for memorisation; loops when `loopRange`. */
  range?: { surah: number; fromAyah: number; toAyah: number; loopRange: boolean };
}

export type Step =
  | { type: 'play'; state: QueueState }
  | { type: 'stop' };

/** Surahs that start with a recited basmala before ayah 1 (all except Al-Fatiha and At-Tawbah). */
export function needsBasmala(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

/** Initial state for starting at a given ayah. */
export function startAt(
  base: Pick<QueueState, 'kind' | 'repeatAyah' | 'continuous' | 'range'>,
  surah: number,
  ayah: number,
): QueueState {
  const basmala = base.kind === 'ayah' && ayah === 1 && needsBasmala(surah);
  return { ...base, surah, ayah: basmala ? 0 : ayah, basmala, plays: 1 };
}

function ayahCount(surah: number): number {
  return SURAHS[surah - 1]?.ayahCount ?? 0;
}

/** What to play after the current item finishes. */
export function nextStep(s: QueueState): Step {
  if (s.kind === 'surah') {
    if (s.continuous && s.surah < 114) return { type: 'play', state: { ...s, surah: s.surah + 1, ayah: 1, plays: 1 } };
    return { type: 'stop' };
  }
  if (s.basmala) return { type: 'play', state: { ...s, basmala: false, ayah: 1, plays: 1 } };
  if (s.repeatAyah === 0 || s.plays < s.repeatAyah) return { type: 'play', state: { ...s, plays: s.plays + 1 } };

  if (s.range && s.surah === s.range.surah && s.ayah >= s.range.toAyah) {
    if (s.range.loopRange) return { type: 'play', state: startAt(s, s.range.surah, s.range.fromAyah) };
    return { type: 'stop' };
  }
  if (s.ayah < ayahCount(s.surah)) return { type: 'play', state: { ...s, ayah: s.ayah + 1, plays: 1 } };
  if (s.continuous && s.surah < 114) return { type: 'play', state: startAt(s, s.surah + 1, 1) };
  return { type: 'stop' };
}

/** Skip forward one ayah (or surah for gapless reciters), ignoring repeat counts. */
export function skipNext(s: QueueState): Step {
  if (s.kind === 'surah') {
    return s.surah < 114 ? { type: 'play', state: { ...s, surah: s.surah + 1, plays: 1 } } : { type: 'stop' };
  }
  // Treat the current ayah as fully repeated, then advance; keep the user's repeat setting.
  const step = nextStep({ ...s, repeatAyah: 1, plays: 1, continuous: true, range: undefined });
  return step.type === 'play' ? { type: 'play', state: { ...step.state, repeatAyah: s.repeatAyah, continuous: s.continuous, range: s.range } } : step;
}

/** Go back one ayah (or surah); from the start of a surah go to the previous surah's last ayah. */
export function skipPrev(s: QueueState): QueueState {
  if (s.kind === 'surah') return { ...s, surah: Math.max(1, s.surah - 1), plays: 1 };
  if (s.basmala || s.ayah <= 1) {
    if (s.surah === 1) return startAt(s, 1, 1);
    const prev = s.surah - 1;
    return { ...s, surah: prev, ayah: ayahCount(prev), basmala: false, plays: 1 };
  }
  return { ...s, ayah: s.ayah - 1, plays: 1 };
}
