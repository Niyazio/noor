import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { JUZ_STARTS, SURAHS } from '@/content/generated/surahs';
import {
  dailyAyahId,
  formatAyahForSharing,
  getSurahAyahs,
  getTranslationEditions,
  parseAyahReference,
  searchAyahs,
  searchSurahs,
} from '@/features/quran/repository';
import { verifyContentDb } from '@/db';
import { openNodeDb } from './nodeSqlite';

jest.mock('expo-sqlite', () => ({}));

/** Parses the pinned, verbatim Tanzil XML independently of the build script. */
let sourceCache: Map<string, string> | null = null;
function sourceAyahs(): Map<string, string> {
  if (sourceCache) return sourceCache;
  const xml = readFileSync(path.join(__dirname, '../content-sources/tanzil/quran-uthmani.xml'), 'utf8');
  const map = new Map<string, string>();
  for (const sura of xml.matchAll(/<sura index="(\d+)"[^>]*>([\s\S]*?)<\/sura>/g)) {
    for (const aya of sura[2].matchAll(/<aya index="(\d+)" text="([^"]*)"/g)) map.set(`${sura[1]}:${aya[1]}`, aya[2]);
  }
  sourceCache = map;
  return map;
}

const db = openNodeDb(path.join(__dirname, '../assets/content/content.db'), true);
afterAll(() => db.close());

describe('Quran content integrity', () => {
  it('has all 114 surahs with correct ayah counts', async () => {
    const rows = await db.getAllAsync<{ surah: number; n: number }>(
      'SELECT surah, COUNT(*) AS n FROM ayahs GROUP BY surah ORDER BY surah',
    );
    expect(rows).toHaveLength(114);
    expect(SURAHS).toHaveLength(114);
    rows.forEach((r, i) => {
      expect(r.surah).toBe(i + 1);
      expect(r.n).toBe(SURAHS[i].ayahCount);
    });
    const total = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ayahs');
    expect(total?.n).toBe(6236);
  });

  it('has stable, contiguous ayah ids in mushaf order', async () => {
    const rows = await db.getAllAsync<{ id: number; surah: number; ayah: number }>('SELECT id, surah, ayah FROM ayahs ORDER BY surah, ayah');
    rows.forEach((r, i) => expect(r.id).toBe(i + 1));
    expect(rows[261]).toEqual({ id: 262, surah: 2, ayah: 255 });
    SURAHS.forEach((s) => expect(rows[s.firstAyahId - 1]).toMatchObject({ surah: s.id, ayah: 1 }));
  });

  it('matches the canonical text checksum recorded at build time', async () => {
    const rows = await db.getAllAsync<{ surah: number; ayah: number; text: string }>('SELECT surah, ayah, text FROM ayahs ORDER BY id');
    const hash = createHash('sha256').update(rows.map((r) => `${r.surah}:${r.ayah}\t${r.text}\n`).join('')).digest('hex');
    expect(hash).toBe(CONTENT_MANIFEST.quran.textSha256);
    const meta = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'quran_text_sha256'");
    expect(meta?.value).toBe(hash);
  });

  it('is byte-identical to the verbatim Tanzil source for every ayah (no normalisation)', async () => {
    const rows = await db.getAllAsync<{ surah: number; ayah: number; text: string }>('SELECT surah, ayah, text FROM ayahs ORDER BY id');
    const source = sourceAyahs();
    expect(source.size).toBe(6236);
    for (const r of rows) expect(r.text).toBe(source.get(`${r.surah}:${r.ayah}`));
    // Tanzil orders shadda before the short vowel; NFC would reorder it. Guard against that.
    expect(source.get('112:1')).toContain('\u0644\u0651\u064E');
  });

  it('stores the basmala for every surah except Al-Fatiha and At-Tawbah', async () => {
    const xml = readFileSync(path.join(__dirname, '../content-sources/tanzil/quran-uthmani.xml'), 'utf8');
    const attrs = new Map<number, string>();
    for (const m of xml.matchAll(/<sura index="(\d+)"[^>]*>\s*<aya index="1" text="[^"]*" bismillah="([^"]*)"/g)) {
      attrs.set(Number(m[1]), m[2]);
    }
    expect(attrs.size).toBe(112);
    const rows = await db.getAllAsync<{ id: number; bismillah: string | null }>('SELECT id, bismillah FROM surahs ORDER BY id');
    for (const r of rows) {
      if (r.id === 1 || r.id === 9) expect(r.bismillah).toBeNull();
      else expect(r.bismillah).toBe(attrs.get(r.id));
    }
  });

  it('keeps the Tanzil copyright block', async () => {
    const meta = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'quran_copyright_block'");
    expect(meta?.value).toContain('Tanzil Quran Text (Uthmani');
    expect(meta?.value).toContain('CHANGING IT IS NOT ALLOWED');
  });

  it('has correct structural metadata', async () => {
    expect(JUZ_STARTS).toHaveLength(30);
    expect(JUZ_STARTS[0]).toMatchObject({ surah: 1, ayah: 1 });
    expect(JUZ_STARTS[29]).toMatchObject({ surah: 78, ayah: 1 });
    const sajdah = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ayahs WHERE sajdah = 1');
    expect(sajdah?.n).toBe(15);
    const pages = await db.getFirstAsync<{ n: number }>('SELECT MAX(page) AS n FROM ayahs');
    expect(pages?.n).toBe(604);
    const rubs = await db.getFirstAsync<{ n: number }>('SELECT COUNT(DISTINCT rub) AS n FROM ayahs');
    expect(rubs?.n).toBe(240);
    expect(SURAHS[1]).toMatchObject({ nameTranslit: 'Al-Baqara', revelation: 'medinan', ayahCount: 286 });
    expect(SURAHS[0].revelation).toBe('meccan');
  });

  it('aligns every translation with every ayah', async () => {
    const eds = await getTranslationEditions(db);
    expect(eds.map((e) => e.id).sort()).toEqual(['en.shakir', 'hi.hindi', 'ur.jawadi']);
    for (const e of eds) {
      const r = await db.getFirstAsync<{ n: number; mn: number; mx: number }>(
        'SELECT COUNT(*) AS n, MIN(ayah_id) AS mn, MAX(ayah_id) AS mx FROM translations WHERE edition_id = ?', e.id,
      );
      expect(r).toEqual({ n: 6236, mn: 1, mx: 6236 });
    }
    const [first] = await getSurahAyahs(db, 1, ['en.shakir']);
    expect(first.translations[0].text).toBe('In the name of Allah, the Beneficent, the Merciful.');
  });

  it('passes the startup verification', async () => {
    await expect(verifyContentDb(db)).resolves.toBeUndefined();
  });
});

describe('Quran navigation and search', () => {
  it('parses ayah references and rejects invalid ones', () => {
    expect(parseAyahReference('2:255')).toEqual({ surah: 2, ayah: 255 });
    expect(parseAyahReference('18')).toEqual({ surah: 18, ayah: 1 });
    expect(parseAyahReference('2 286')).toEqual({ surah: 2, ayah: 286 });
    expect(parseAyahReference('2:287')).toBeNull();
    expect(parseAyahReference('115:1')).toBeNull();
    expect(parseAyahReference('0')).toBeNull();
    expect(parseAyahReference('hello')).toBeNull();
  });

  it('finds surahs by transliteration, meaning, number and Arabic name', () => {
    expect(searchSurahs('kahf').map((s) => s.id)).toContain(18);
    expect(searchSurahs('Al-Kahf').map((s) => s.id)).toContain(18);
    expect(searchSurahs('the cow').map((s) => s.id)).toContain(2);
    expect(searchSurahs('36').map((s) => s.id)).toContain(36);
    expect(searchSurahs('الكهف').map((s) => s.id)).toContain(18);
  });

  it('finds Arabic text without diacritics', async () => {
    const hits = await searchAyahs(db, 'قل هو الله احد', { editionIds: [] });
    expect(hits.map((h) => `${h.surah}:${h.ayah}`)).toContain('112:1');
    expect(hits[0].text).toBe(sourceAyahs().get('112:1'));
  });

  it('searches translations and honours filters', async () => {
    const hits = await searchAyahs(db, 'Beneficent', { editionIds: ['en.shakir'], scope: 'translation', surah: 1 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.surah === 1 && h.match === 'translation')).toBe(true);
    const juz30 = await searchAyahs(db, 'Lord', { editionIds: ['en.shakir'], juz: 30 }, 500);
    expect(juz30.every((h) => h.surah >= 78)).toBe(true);
  });

  it('treats LIKE wildcards in queries literally', async () => {
    expect(await searchAyahs(db, '%%', { editionIds: ['en.shakir'] })).toEqual([]);
  });

  it('formats shared ayahs with reference and source', async () => {
    const eds = await getTranslationEditions(db);
    const [a] = await getSurahAyahs(db, 112, ['en.shakir']);
    const text = formatAyahForSharing(a, eds, 'Tanzil Quran Text (Uthmani) 1.0.2');
    expect(text.startsWith(sourceAyahs().get('112:1')!)).toBe(true);
    expect(text).toContain('Quran 112:1');
    expect(text).toContain('Shakir');
    expect(text).toContain('tanzil.net');
  });

  it('picks a stable daily ayah within range', () => {
    expect(dailyAyahId('2026-10-23')).toBe(dailyAyahId('2026-10-23'));
    for (const k of ['2026-01-01', '2026-06-30', '2030-12-31']) {
      const id = dailyAyahId(k);
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(6236);
    }
  });
});
