import { getCustomAzan } from './customAzan';

let current: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;

/**
 * A soft three-note bell synthesised with Web Audio — used when no Azan recording has been chosen,
 * so the app never ships an unlicensed recording.
 */
function playChime(): Promise<void> {
  const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return Promise.reject(new Error('Web Audio unavailable'));
  ctx = ctx ?? new AC();
  const c = ctx;
  return c.resume().then(() => {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const t0 = c.currentTime + i * 0.55;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 1.9);
    });
  });
}

/** Plays the user's Azan recording, or the chime. Rejects if the browser blocks autoplay. */
export async function playAzan(): Promise<'recording' | 'chime'> {
  stopAzan();
  const custom = await getCustomAzan().catch(() => null);
  if (custom) {
    current = new Audio(custom.url);
    await current.play();
    return 'recording';
  }
  await playChime();
  return 'chime';
}

export function stopAzan() {
  if (current) {
    current.pause();
    current = null;
  }
}
