import { nextStep, skipNext, skipPrev, startAt, type QueueState } from '@/features/audio/queue';
import { RECITERS, ayahAudioUrl, findReciter, surahAudioUrl } from '@/features/audio/reciters';

const base = { kind: 'ayah' as const, repeatAyah: 1, continuous: true };
const play = (s: QueueState) => {
  const step = nextStep(s);
  if (step.type !== 'play') throw new Error('expected play');
  return step.state;
};

describe('recitation URLs', () => {
  it('follows the SSSAAA / SSS file layout used by Quran.com apps', () => {
    expect(ayahAudioUrl(findReciter('abdulbaset_murattal'), 2, 255)).toBe('https://verses.quran.com/AbdulBaset/Murattal/mp3/002255.mp3');
    expect(ayahAudioUrl(findReciter('minshawi_mujawwad'), 1, 1)).toBe('https://mirrors.quranicaudio.com/everyayah/Minshawy_Mujawwad_192kbps/001001.mp3');
    expect(surahAudioUrl(findReciter('husary_gapless'), 36)).toBe('https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/036.mp3');
    expect(() => surahAudioUrl(findReciter('minshawi_mujawwad'), 1)).toThrow();
  });
  it('documents a source for every reciter and falls back safely', () => {
    for (const r of RECITERS) {
      expect(r.source.length).toBeGreaterThan(10);
      expect(r.baseUrl).toMatch(/^https:\/\/.+\/$/);
    }
    expect(findReciter('unknown').id).toBe(RECITERS[0].id);
  });
});

describe('playback queue', () => {
  it('plays the basmala before ayah 1 except for Al-Fatiha and At-Tawbah', () => {
    expect(startAt(base, 2, 1)).toMatchObject({ basmala: true, ayah: 0 });
    expect(startAt(base, 1, 1)).toMatchObject({ basmala: false, ayah: 1 });
    expect(startAt(base, 9, 1)).toMatchObject({ basmala: false, ayah: 1 });
    expect(startAt(base, 2, 5)).toMatchObject({ basmala: false, ayah: 5 });
    expect(play(startAt(base, 2, 1))).toMatchObject({ basmala: false, ayah: 1, plays: 1 });
  });

  it('repeats an ayah the requested number of times', () => {
    let s = startAt({ ...base, repeatAyah: 3 }, 2, 255);
    s = play(s);
    expect(s).toMatchObject({ ayah: 255, plays: 2 });
    s = play(s);
    expect(s).toMatchObject({ ayah: 255, plays: 3 });
    expect(play(s)).toMatchObject({ ayah: 256, plays: 1 });
    expect(play(startAt({ ...base, repeatAyah: 0 }, 2, 255))).toMatchObject({ ayah: 255, plays: 2 });
  });

  it('continues into the next surah or stops at the end', () => {
    expect(play(startAt(base, 1, 7))).toMatchObject({ surah: 2, basmala: true });
    expect(nextStep(startAt({ ...base, continuous: false }, 1, 7))).toEqual({ type: 'stop' });
    expect(nextStep(startAt(base, 114, 6))).toEqual({ type: 'stop' });
  });

  it('loops or stops at the end of a memorisation range', () => {
    const range = { surah: 67, fromAyah: 1, toAyah: 3, loopRange: true };
    expect(play(startAt({ ...base, range }, 67, 3))).toMatchObject({ surah: 67, basmala: true });
    expect(nextStep(startAt({ ...base, range: { ...range, loopRange: false } }, 67, 3))).toEqual({ type: 'stop' });
  });

  it('skips ignoring repeats and keeps the repeat setting', () => {
    const s = startAt({ ...base, repeatAyah: 0 }, 2, 10);
    const n = skipNext(s);
    expect(n).toMatchObject({ type: 'play', state: { ayah: 11, repeatAyah: 0 } });
    expect(skipPrev(startAt(base, 2, 10))).toMatchObject({ surah: 2, ayah: 9 });
    expect(skipPrev(startAt(base, 3, 1))).toMatchObject({ surah: 2, ayah: 286, basmala: false });
    expect(skipPrev(startAt(base, 1, 1))).toMatchObject({ surah: 1, ayah: 1 });
  });

  it('moves surah by surah for gapless reciters', () => {
    const g = startAt({ ...base, kind: 'surah' }, 36, 1);
    expect(play(g)).toMatchObject({ surah: 37 });
    expect(skipPrev(g)).toMatchObject({ surah: 35 });
    expect(nextStep({ ...g, surah: 114 })).toEqual({ type: 'stop' });
  });
});
