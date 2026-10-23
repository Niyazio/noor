export type Revelation = 'meccan' | 'medinan';

export interface SurahInfo {
  id: number;
  nameAr: string;
  nameTranslit: string;
  nameEn: string;
  ayahCount: number;
  revelation: Revelation;
  revelationOrder: number;
  firstAyahId: number;
  startPage: number;
  juzStart: number;
}

export interface JuzStart {
  juz: number;
  surah: number;
  ayah: number;
  firstAyahId: number;
  lastAyahId: number;
}
