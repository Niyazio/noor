/**
 * Builds the read-only content database shipped with the app (assets/content/content.db)
 * and small generated TypeScript modules used for synchronous metadata access.
 *
 *   npm run content:build
 *
 * Inputs are pinned in content-sources/manifest.json. The script aborts on any
 * checksum mismatch or integrity failure; it never "repairs" religious text.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import * as hafs from 'quran-meta/hafs';
import { surahNamesEn } from 'quran-meta';

import { normalizeArabic, normalizeLatin } from '../../src/features/quran/normalize.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCES = join(ROOT, 'content-sources');
const OUT_DB = join(ROOT, 'assets/content/content.db');
const OUT_TS_DIR = join(ROOT, 'src/content/generated');
/** Bump when the content.db schema changes so installed apps re-import the asset. */
const SCHEMA_VERSION = 2;

type TranslationSource = {
  id: string;
  file: string;
  sha256: string;
  language: string;
  direction: 'ltr' | 'rtl';
  name: string;
  translator: string;
  source: string;
  sourceUrl: string;
  license: string;
  commercialUseCleared: boolean;
};

const manifest = JSON.parse(readFileSync(join(SOURCES, 'manifest.json'), 'utf8'));
const failures: string[] = [];
const fail = (msg: string) => failures.push(msg);

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function readPinned(relPath: string, expected: string): Buffer {
  const buf = readFileSync(join(SOURCES, relPath));
  const actual = sha256(buf);
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${relPath}: expected ${expected}, got ${actual}`);
  }
  return buf;
}

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// 1. Quran text
// ---------------------------------------------------------------------------
const quranXml = readPinned(manifest.quran.file, manifest.quran.sha256).toString('utf8');

if (!quranXml.includes('Tanzil Quran Text (Uthmani') || !quranXml.includes('Creative Commons Attribution 3.0')) {
  fail('Tanzil copyright block missing or altered');
}
const copyrightBlock = (quranXml.match(/<!--([\s\S]*?)-->/)?.[1] ?? '').trim();

type ParsedSurah = { index: number; name: string; ayahs: { index: number; text: string; bismillah?: string }[] };
const surahs: ParsedSurah[] = [];
const suraRe = /<sura index="(\d+)" name="([^"]*)">([\s\S]*?)<\/sura>/g;
const ayaRe = /<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")?\s*\/>/g;
for (const m of quranXml.matchAll(suraRe)) {
  const ayahs = [...m[3].matchAll(ayaRe)].map((a) => ({
    index: Number(a[1]),
    text: decodeXmlAttr(a[2]),
    bismillah: a[3] ? decodeXmlAttr(a[3]) : undefined,
  }));
  surahs.push({ index: Number(m[1]), name: decodeXmlAttr(m[2]), ayahs });
}

if (surahs.length !== hafs.meta.numSurahs) fail(`Expected ${hafs.meta.numSurahs} surahs, found ${surahs.length}`);
let totalAyahs = 0;
const allowedChars = /^[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿  ]+$/;
surahs.forEach((s, i) => {
  if (s.index !== i + 1) fail(`Surah order broken at position ${i + 1} (index ${s.index})`);
  const expected = hafs.getSurahMeta(s.index as never).ayahCount;
  if (s.ayahs.length !== expected) fail(`Surah ${s.index}: ${s.ayahs.length} ayahs, quran-meta expects ${expected}`);
  s.ayahs.forEach((a, j) => {
    if (a.index !== j + 1) fail(`Surah ${s.index}: ayah order broken at ${j + 1}`);
    if (!a.text.trim()) fail(`Empty text at ${s.index}:${a.index}`);
    if (!allowedChars.test(a.text)) fail(`Unexpected characters at ${s.index}:${a.index}`);
    if (a.bismillah && j !== 0) fail(`Bismillah attribute on non-first ayah ${s.index}:${a.index}`);
  });
  const hasBismillahAttr = Boolean(s.ayahs[0]?.bismillah);
  // Tanzil places the basmala as ayah 1:1 for Al-Fatiha and omits it for At-Tawbah.
  const shouldHave = s.index !== 1 && s.index !== 9;
  if (hasBismillahAttr !== shouldHave) fail(`Unexpected bismillah attribute state for surah ${s.index}`);
  totalAyahs += s.ayahs.length;
});
if (totalAyahs !== hafs.meta.numAyahs) fail(`Expected ${hafs.meta.numAyahs} ayahs, found ${totalAyahs}`);

// Canonical text hash: "surah:ayah\ttext\n" for every ayah in order. Tests recompute it from the DB.
const canonicalTextHash = sha256(
  surahs.flatMap((s) => s.ayahs.map((a) => `${s.index}:${a.index}\t${a.text}\n`)).join(''),
);

// ---------------------------------------------------------------------------
// 2. Translations (Tanzil "sura|aya|text" layout)
// ---------------------------------------------------------------------------
const translations = (manifest.translations as TranslationSource[]).map((t) => {
  const raw = readPinned(t.file, t.sha256).toString('utf8');
  const rows = new Map<string, string>();
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [sura, aya, ...rest] = line.split('|');
    const key = `${Number(sura)}:${Number(aya)}`;
    if (rows.has(key)) fail(`${t.id}: duplicate row ${key}`);
    rows.set(key, rest.join('|'));
  }
  for (const s of surahs) {
    for (const a of s.ayahs) {
      const text = rows.get(`${s.index}:${a.index}`);
      if (text === undefined) fail(`${t.id}: missing ${s.index}:${a.index}`);
      else if (!text.trim()) fail(`${t.id}: empty ${s.index}:${a.index}`);
    }
  }
  if (rows.size !== totalAyahs) fail(`${t.id}: ${rows.size} rows, expected ${totalAyahs}`);
  return { ...t, rows, textHash: sha256(raw) };
});

// ---------------------------------------------------------------------------
// 3. Cities
// ---------------------------------------------------------------------------
const cities = JSON.parse(readFileSync(join(SOURCES, manifest.cities.file), 'utf8')) as [
  string, string, string, number, number, string, number,
][];
for (const c of cities) {
  if (Math.abs(c[3]) > 90 || Math.abs(c[4]) > 180 || !c[5].includes('/')) fail(`Invalid city row ${c[0]}`);
}

if (failures.length) {
  console.error('Content integrity check FAILED:\n - ' + failures.slice(0, 50).join('\n - '));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4. Write content.db
// ---------------------------------------------------------------------------
const contentVersion = sha256(
  [manifest.quran.sha256, ...translations.map((t) => t.sha256), sha256(JSON.stringify(cities)), 'schema-' + SCHEMA_VERSION].join(':'),
).slice(0, 12);

mkdirSync(dirname(OUT_DB), { recursive: true });
if (existsSync(OUT_DB)) rmSync(OUT_DB);
const db = new DatabaseSync(OUT_DB);
db.exec(`
  PRAGMA journal_mode = DELETE;
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE surahs (
    id INTEGER PRIMARY KEY, name_ar TEXT NOT NULL, name_translit TEXT NOT NULL, name_en TEXT NOT NULL,
    ayah_count INTEGER NOT NULL, revelation TEXT NOT NULL CHECK (revelation IN ('meccan','medinan')),
    revelation_order INTEGER NOT NULL, ruku_count INTEGER NOT NULL, first_ayah_id INTEGER NOT NULL,
    start_page INTEGER NOT NULL, bismillah TEXT
  );
  CREATE TABLE ayahs (
    id INTEGER PRIMARY KEY, surah INTEGER NOT NULL, ayah INTEGER NOT NULL, text TEXT NOT NULL,
    text_search TEXT NOT NULL, juz INTEGER NOT NULL, hizb INTEGER NOT NULL, rub INTEGER NOT NULL,
    page INTEGER NOT NULL, ruku INTEGER NOT NULL, sajdah INTEGER NOT NULL DEFAULT 0,
    UNIQUE (surah, ayah)
  );
  CREATE INDEX ayahs_juz ON ayahs (juz);
  CREATE INDEX ayahs_page ON ayahs (page);
  CREATE INDEX ayahs_rub ON ayahs (rub);
  CREATE TABLE translation_editions (
    id TEXT PRIMARY KEY, language TEXT NOT NULL, direction TEXT NOT NULL, name TEXT NOT NULL,
    translator TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT NOT NULL, license TEXT NOT NULL,
    commercial_use_cleared INTEGER NOT NULL, text_sha256 TEXT NOT NULL
  );
  -- text_search holds a case/diacritic-folded copy only for Latin-script editions; other scripts search \`text\`.
  CREATE TABLE translations (
    edition_id TEXT NOT NULL, ayah_id INTEGER NOT NULL, text TEXT NOT NULL, text_search TEXT,
    UNIQUE (edition_id, ayah_id)
  );
  CREATE TABLE cities (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, name_search TEXT NOT NULL, province TEXT NOT NULL,
    country TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, timezone TEXT NOT NULL, population INTEGER NOT NULL
  );
  CREATE INDEX cities_name ON cities (name_search);
`);

const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
const metaRows: Record<string, string> = {
  content_version: contentVersion,
  schema_version: String(SCHEMA_VERSION),
  quran_dataset: `${manifest.quran.name} ${manifest.quran.version}`,
  quran_source_sha256: manifest.quran.sha256,
  quran_text_sha256: canonicalTextHash,
  quran_license: manifest.quran.license,
  quran_source_url: manifest.quran.sourceUrl,
  quran_copyright_block: copyrightBlock,
  ayah_count: String(totalAyahs),
};
for (const [k, v] of Object.entries(metaRows)) insertMeta.run(k, v);

const insertSurah = db.prepare(
  'INSERT INTO surahs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
);
const insertAyah = db.prepare('INSERT INTO ayahs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const generatedSurahs: unknown[] = [];

db.exec('BEGIN');
let ayahId = 0;
for (const s of surahs) {
  const sm = hafs.getSurahMeta(s.index as never);
  const [translit, meaning] = surahNamesEn[s.index] as [string, string];
  const startPage = hafs.findPage(s.index as never, 1 as never);
  insertSurah.run(
    s.index, s.name, translit, meaning, s.ayahs.length, sm.isMeccan ? 'meccan' : 'medinan',
    sm.surahOrder, sm.rukuCount, sm.firstAyahId, startPage, s.ayahs[0].bismillah ?? null,
  );
  generatedSurahs.push({
    id: s.index, nameAr: s.name, nameTranslit: translit, nameEn: meaning, ayahCount: s.ayahs.length,
    revelation: sm.isMeccan ? 'meccan' : 'medinan', revelationOrder: sm.surahOrder,
    firstAyahId: sm.firstAyahId, startPage, juzStart: hafs.findJuz(s.index as never, 1 as never),
  });
  for (const a of s.ayahs) {
    ayahId += 1;
    const am = hafs.getAyahMeta(ayahId as never);
    if (am.surah !== s.index || am.ayah !== a.index) {
      throw new Error(`quran-meta ayah id ${ayahId} maps to ${am.surah}:${am.ayah}, text has ${s.index}:${a.index}`);
    }
    insertAyah.run(
      ayahId, s.index, a.index, a.text, normalizeArabic(a.text), am.juz, am.hizbId, am.rubAlHizbId,
      am.page, am.ruku, am.isSajdahAyah ? 1 : 0,
    );
  }
}
db.exec('COMMIT');

const insertEdition = db.prepare('INSERT INTO translation_editions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertTranslation = db.prepare('INSERT INTO translations VALUES (?, ?, ?, ?)');
db.exec('BEGIN');
for (const t of translations) {
  insertEdition.run(
    t.id, t.language, t.direction, t.name, t.translator, t.source, t.sourceUrl, t.license,
    t.commercialUseCleared ? 1 : 0, t.textHash,
  );
  const latinScript = /^(en|fr|es|de|id|ms|tr|sv|nl|it|pt)$/.test(t.language);
  let id = 0;
  for (const s of surahs) {
    for (const a of s.ayahs) {
      id += 1;
      const text = t.rows.get(`${s.index}:${a.index}`)!;
      insertTranslation.run(t.id, id, text, latinScript ? normalizeLatin(text) : null);
    }
  }
}
db.exec('COMMIT');

const insertCity = db.prepare('INSERT INTO cities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
db.exec('BEGIN');
cities.forEach((c, i) => insertCity.run(i + 1, c[0], normalizeLatin(c[0]), c[1], c[2], c[3], c[4], c[5], c[6]));
db.exec('COMMIT');
db.exec('VACUUM');
db.close();

// ---------------------------------------------------------------------------
// 5. Generated TypeScript
// ---------------------------------------------------------------------------
mkdirSync(OUT_TS_DIR, { recursive: true });
const juzStarts = Array.from({ length: hafs.meta.numJuzs }, (_, i) => {
  const jm = hafs.getJuzMeta((i + 1) as never);
  return { juz: i + 1, surah: jm.first[0], ayah: jm.first[1], firstAyahId: jm.firstAyahId, lastAyahId: jm.lastAyahId };
});
const header = '// AUTO-GENERATED by scripts/content/build-content.ts — do not edit by hand.\n';
writeFileSync(
  join(OUT_TS_DIR, 'surahs.ts'),
  `${header}import type { SurahInfo, JuzStart } from '../types';\n\n` +
    `export const SURAHS: readonly SurahInfo[] = ${JSON.stringify(generatedSurahs, null, 1)} as const;\n\n` +
    `export const JUZ_STARTS: readonly JuzStart[] = ${JSON.stringify(juzStarts, null, 1)} as const;\n`,
);
writeFileSync(
  join(OUT_TS_DIR, 'contentManifest.ts'),
  `${header}export const CONTENT_MANIFEST = ${JSON.stringify(
    {
      contentVersion,
      totalAyahs,
      quran: {
        name: manifest.quran.name,
        version: manifest.quran.version,
        riwaya: manifest.quran.riwaya,
        license: manifest.quran.license,
        sourceUrl: manifest.quran.sourceUrl,
        textSha256: canonicalTextHash,
      },
      translations: translations.map((t) => ({
        id: t.id, language: t.language, direction: t.direction, name: t.name, translator: t.translator,
        source: t.source, sourceUrl: t.sourceUrl, license: t.license, commercialUseCleared: t.commercialUseCleared,
      })),
      cities: { name: manifest.cities.name, source: manifest.cities.source, license: manifest.cities.license, count: cities.length },
    },
    null,
    2,
  )} as const;\n`,
);

console.log(`content.db built: version ${contentVersion}, ${surahs.length} surahs, ${totalAyahs} ayahs, ` +
  `${translations.length} translations, ${cities.length} cities. Canonical text sha256 ${canonicalTextHash}`);
