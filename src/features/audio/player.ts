import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';

import { SURAHS } from '@/content/generated/surahs';
import { useSettings } from '@/store/settings';
import { nextStep, skipNext, skipPrev, startAt, type QueueState } from './queue';
import { ayahAudioUrl, findReciter, surahAudioUrl } from './reciters';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface AudioStore {
  status: PlayerStatus;
  queue: QueueState | null;
  reciterId: string;
  error: string | null;
  position: number;
  duration: number;
  playFrom: (surah: number, ayah: number, range?: QueueState['range']) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
}

const LOAD_TIMEOUT_MS = 20_000;
let player: AudioPlayer | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
let modeSet = false;
/** True once the current source has actually loaded (has a duration). */
let loadedOk = false;

function sourceFor(q: QueueState, reciterId: string): string {
  const reciter = findReciter(reciterId);
  if (reciter.kind === 'surah') return surahAudioUrl(reciter, q.surah);
  // The basmala before a surah uses Al-Fatiha 1:1, as Quran.com's apps do.
  return q.basmala ? ayahAudioUrl(reciter, 1, 1) : ayahAudioUrl(reciter, q.surah, q.ayah);
}

function title(q: QueueState): string {
  const s = SURAHS[q.surah - 1];
  return q.basmala || findReciter(useAudio.getState().reciterId).kind === 'surah'
    ? `${s.nameTranslit} (${s.id})`
    : `${s.nameTranslit} ${q.surah}:${q.ayah}`;
}

async function ensurePlayer(): Promise<AudioPlayer> {
  if (!modeSet) {
    modeSet = true;
    // Background playback + lock-screen controls (Android needs doNotMix for sustained playback).
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
  }
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

function clearLoadTimer() {
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = null;
}

function onStatus(status: AudioStatus) {
  const st = useAudio.getState();
  if (!st.queue) return;
  if (status.isLoaded && status.duration > 0) {
    loadedOk = true;
    clearLoadTimer();
  }
  if (status.didJustFinish) {
    const step = nextStep(st.queue);
    if (step.type === 'stop') useAudio.setState({ status: 'idle', queue: null });
    else void load(step.state);
    return;
  }
  if (/fail|error/i.test(status.playbackState)) {
    clearLoadTimer();
    useAudio.setState({ status: 'error', error: 'playback-failed' });
    return;
  }
  // Stay "loading" until audio actually starts (the load timeout reports failures); a stop while
  // playing that we did not request (lock screen, headset, phone call) becomes "paused".
  let next: PlayerStatus = st.status;
  if (st.status === 'error') next = 'error';
  else if (!loadedOk) next = 'loading';
  else if (status.playing) next = 'playing';
  else if (st.status === 'playing' && !status.isBuffering) next = 'paused';
  useAudio.setState({ status: next, position: status.currentTime, duration: status.duration });
}

async function load(q: QueueState) {
  const p = await ensurePlayer();
  const { reciterId } = useAudio.getState();
  useAudio.setState({ queue: q, status: 'loading', error: null, position: 0, duration: 0 });
  clearLoadTimer();
  loadedOk = false;
  loadTimer = setTimeout(() => {
    if (!loadedOk && useAudio.getState().queue === q) {
      p.pause();
      useAudio.setState({ status: 'error', error: 'network' });
    }
  }, LOAD_TIMEOUT_MS);
  p.replace({ uri: sourceFor(q, reciterId) });
  p.playbackRate = useSettings.getState().audio.speed;
  p.play();
  const reciter = findReciter(reciterId);
  try {
    p.setActiveForLockScreen(true, { title: title(q), artist: reciter.name, albumTitle: 'Noor' }, { showSeekForward: false, showSeekBackward: false });
  } catch {
    // Lock-screen controls unavailable on this platform.
  }
}

export const useAudio = create<AudioStore>((set, get) => ({
  status: 'idle',
  queue: null,
  reciterId: useSettings.getState().audio.reciterId,
  error: null,
  position: 0,
  duration: 0,
  playFrom: (surah, ayah, range) => {
    const a = useSettings.getState().audio;
    const reciter = findReciter(a.reciterId);
    set({ reciterId: reciter.id });
    void load(startAt({ kind: reciter.kind, repeatAyah: a.repeatAyah, continuous: a.continuous, range }, surah, reciter.kind === 'surah' ? 1 : ayah));
  },
  toggle: () => {
    const { status, queue } = get();
    if (!player || !queue) return;
    if (status === 'loading') {
      // Cancel a load that has not started yet.
      clearLoadTimer();
      player.pause();
      set({ status: 'idle', queue: null });
    } else if (status === 'playing') {
      player.pause();
      set({ status: 'paused' });
    } else if (status === 'error') {
      void load(queue);
    } else {
      player.play();
      set({ status: 'playing' });
    }
  },
  next: () => {
    const { queue } = get();
    if (!queue) return;
    const step = skipNext(queue);
    if (step.type === 'play') void load(step.state);
  },
  prev: () => {
    const { queue } = get();
    if (queue) void load(skipPrev(queue));
  },
  stop: () => {
    clearLoadTimer();
    player?.pause();
    try {
      player?.clearLockScreenControls();
    } catch {
      // ignore
    }
    set({ status: 'idle', queue: null, error: null });
  },
  setRate: (rate) => {
    useSettings.getState().update('audio', { speed: rate });
    if (player) player.playbackRate = rate;
  },
}));

// Settings changes (repeat count, continuous) apply to the running queue.
useSettings.subscribe((s, prev) => {
  if (s.audio === prev.audio) return;
  const { queue } = useAudio.getState();
  if (queue) useAudio.setState({ queue: { ...queue, repeatAyah: s.audio.repeatAyah, continuous: s.audio.continuous } });
  if (s.audio.reciterId !== prev.audio.reciterId && queue) {
    // Restart the current position with the new reciter.
    const r = findReciter(s.audio.reciterId);
    useAudio.setState({ reciterId: r.id });
    void load(startAt({ kind: r.kind, repeatAyah: s.audio.repeatAyah, continuous: s.audio.continuous }, queue.surah, r.kind === 'surah' ? 1 : Math.max(1, queue.ayah)));
  }
});

/**
 * Key "surah:ayah" of the ayah being recited (per-ayah reciters only), for highlighting.
 * Returns a string so the zustand selector stays referentially stable.
 */
export function useRecitingKey(): string | null {
  return useAudio((s) =>
    s.queue && s.queue.kind === 'ayah' && !s.queue.basmala && s.status !== 'idle' ? `${s.queue.surah}:${s.queue.ayah}` : null,
  );
}
