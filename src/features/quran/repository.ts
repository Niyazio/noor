import { SURAHS } from '@/content/generated/surahs';
import type { SqlDb } from '@/db/types';
import { containsArabic, normalizeArabic, normalizeLatin } from './normalize';

export interface Ayah {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  juz: number;
  hizb: number;
  rub: number;
  page: number;
  sajdah: boolean;
  translations: { editionId: string; text: string }[];
}

export interface TranslationEdition {
  id: string;
  language: string;
  direction: 'ltr' | 'rtl';
  name: string;
  translator: string;
  source: string;
  sourceUrl: string;
  license: string;
  commercialUseCleared: boolean;
}

interface AyahRow {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  juz: number;
  hizb: number;
  rub: number;
  page: number;
  sajdah: number;
}

const AYAH_COLUMNS = 'id, surah, ayah, text, juz, hizb, rub, page, sajdah';

async function attachTranslations(db: SqlDb, rows: AyahRow[], editionIds: string[]): Promise<Ayah[]> {
  const byAyah = new Map<number, { editionId: string; text: string }[]>();
  if (rows.length && editionIds.length) {
    const minId = rows[0].id;
    const maxId = rows[rows.length - 1].id;
    const placeholders = editionIds.map(() => '?').join(',');
    const tr = await db.getAllAsync<{ edition_id: string; ayah_id: number; text: string }>(
      `SELECT edition_id, ayah_id, text FROM translations
       WHERE edition_id IN (${placeholders}) AND ayah_id BETWEEN ? AND ?`,
      ...editionIds, minId, maxId,
    );
    for (const t of tr) {
      const list = byAyah.get(t.ayah_id) ?? [];
      list.push({ editionId: t.edition_id, text: t.text });
      byAyah.set(t.ayah_id, list);
    }
  }
  return rows.map((r) => ({
    ...r,
    sajdah: r.sajdah === 1,
    translations: (byAyah.get(r.id) ?? []).sort(
      (a, b) => editionIds.indexOf(a.editionId) - editionIds.indexOf(b.editionId),
    ),
  }));
}

export function getSurahInfo(surah: number) {
  const info = SURAHS[surah - 1];
  if (!info) throw new RangeError(`Surah ${surah} does not exist`);
  return info;
}

export async function getSurahAyahs(db: SqlDb, surah: number, editionIds: string[]): Promise<Ayah[]> {
  getSurahInfo(surah);
  const rows = await db.getAllAsync<AyahRow>(
    `SELECT ${AYAH_COLUMNS} FROM ayahs WHERE surah = ? ORDER BY id`,
    surah,
  );
  return attachTranslations(db, rows, editionIds);
}

export async function getAyahById(db: SqlDb, id: number, editionIds: string[]): Promise<Ayah | null> {
  const row = await db.getFirstAsync<AyahRow>(`SELECT ${AYAH_COLUMNS} FROM ayahs WHERE id = ?`, id);
  if (!row) return null;
  const [a] = await attachTranslations(db, [row], editionIds);
  return a;
}

export async function getSurahBismillah(db: SqlDb, surah: number): Promise<string | null> {
  const row = await db.getFirstAsync<{ bismillah: string | null }>('SELECT bismillah FROM surahs WHERE id = ?', surah);
  return row?.bismillah ?? null;
}

export async function getTranslationEditions(db: SqlDb): Promise<TranslationEdition[]> {
  const rows = await db.getAllAsync<{
    id: string; language: string; direction: 'ltr' | 'rtl'; name: string; translator: string;
    source: string; source_url: string; license: string; commercial_use_cleared: number;
  }>('SELECT * FROM translation_editions ORDER BY language, name');
  return rows.map((r) => ({
    id: r.id, language: r.language, direction: r.direction, name: r.name, translator: r.translator,
    source: r.source, sourceUrl: r.source_url, license: r.license, commercialUseCleared: r.commercial_use_cleared === 1,
  }));
}

export async function getContentMeta(db: SqlDb): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM meta');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Deterministic "ayah of the day": the same ayah for everyone on a given date. */
export function dailyAyahId(dateKey: string, totalAyahs = 6236): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % totalAyahs) + 1;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface AyahRef {
  surah: number;
  ayah: number;
}

/** Parses "2:255", "2 255", "2.255" or "2" into a validated reference. */
export function parseAyahReference(input: string): AyahRef | null {
  const m = input.trim().match(/^(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?$/);
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = m[2] ? Number(m[2]) : 1;
  const info = SURAHS[surah - 1];
  if (!info || ayah < 1 || ayah > info.ayahCount) return null;
  return { surah, ayah };
}

export function searchSurahs(query: string) {
  const q = normalizeLatin(query).replace(/^(al|an|ar|as|at|ad|az)[-\s]/, '');
  const qAr = normalizeArabic(query);
  if (!q && !qAr) return [];
  return SURAHS.filter((s) => {
    const translit = normalizeLatin(s.nameTranslit);
    return (
      String(s.id) === query.trim() ||
      translit.includes(q) ||
      translit.replace(/^(al|an|ar|as|at|ad|az)-/, '').replace(/-/g, ' ').includes(q.replace(/-/g, ' ')) ||
      normalizeLatin(s.nameEn).includes(q) ||
      (containsArabic(query) && normalizeArabic(s.nameAr).includes(qAr))
    );
  });
}

export interface SearchFilters {
  surah?: number;
  juz?: number;
  scope?: 'all' | 'arabic' | 'translation';
  editionIds: string[];
}

export interface SearchHit {
  ayahId: number;
  surah: number;
  ayah: number;
  text: string;
  match: 'arabic' | 'translation';
  editionId?: string;
  snippet: string;
}

const LIKE_ESCAPE = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Local search over Arabic (diacritic-insensitive) and installed translations. */
export async function searchAyahs(db: SqlDb, query: string, filters: SearchFilters, limit = 100): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.surah) { where.push('a.surah = ?'); params.push(filters.surah); }
  if (filters.juz) { where.push('a.juz = ?'); params.push(filters.juz); }
  const extra = where.length ? ` AND ${where.join(' AND ')}` : '';
  const scope = filters.scope ?? 'all';
  const hits: SearchHit[] = [];

  if (containsArabic(trimmed) && scope !== 'translation') {
    const q = `%${LIKE_ESCAPE(normalizeArabic(trimmed))}%`;
    const rows = await db.getAllAsync<AyahRow>(
      `SELECT a.id, a.surah, a.ayah, a.text FROM ayahs a
       WHERE a.text_search LIKE ? ESCAPE '\\'${extra} ORDER BY a.id LIMIT ?`,
      q, ...params, limit,
    );
    hits.push(...rows.map((r) => ({ ayahId: r.id, surah: r.surah, ayah: r.ayah, text: r.text, match: 'arabic' as const, snippet: r.text })));
  }

  if (scope !== 'arabic' && filters.editionIds.length && hits.length < limit) {
    const latin = `%${LIKE_ESCAPE(normalizeLatin(trimmed))}%`;
    const raw = `%${LIKE_ESCAPE(trimmed.normalize('NFC'))}%`;
    const placeholders = filters.editionIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ id: number; surah: number; ayah: number; text: string; edition_id: string; ttext: string }>(
      `SELECT a.id, a.surah, a.ayah, a.text, t.edition_id, t.text AS ttext
       FROM translations t JOIN ayahs a ON a.id = t.ayah_id
       WHERE t.edition_id IN (${placeholders})
         AND ((t.text_search IS NOT NULL AND t.text_search LIKE ? ESCAPE '\\')
           OR (t.text_search IS NULL AND t.text LIKE ? ESCAPE '\\'))${extra}
       ORDER BY a.id LIMIT ?`,
      ...filters.editionIds, latin, raw, ...params, limit - hits.length,
    );
    const seen = new Set(hits.map((h) => h.ayahId));
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      hits.push({ ayahId: r.id, surah: r.surah, ayah: r.ayah, text: r.text, match: 'translation', editionId: r.edition_id, snippet: r.ttext });
    }
  }
  return hits;
}

/** Formats an ayah for copying/sharing with an unambiguous reference and source. */
export function formatAyahForSharing(
  ayah: Pick<Ayah, 'surah' | 'ayah' | 'text' | 'translations'>,
  editions: TranslationEdition[],
  datasetName: string,
): string {
  const info = getSurahInfo(ayah.surah);
  const lines = [ayah.text, ''];
  for (const t of ayah.translations) {
    const ed = editions.find((e) => e.id === t.editionId);
    lines.push(t.text, `— ${ed ? `${ed.translator} (${ed.source})` : t.editionId}`, '');
  }
  lines.push(`Quran ${ayah.surah}:${ayah.ayah} · Surah ${info.nameTranslit} (${info.nameAr})`);
  lines.push(`Arabic text: ${datasetName}, tanzil.net`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Mushaf pages (Madani 604-page layout)
// ---------------------------------------------------------------------------

export const TOTAL_PAGES = 604;

export interface PageAyah {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  juz: number;
  hizb: number;
  page: number;
  sajdah: boolean;
  /** First ayah of a rub‘ al-hizb (quarter) — shown with the ۞ ornament. */
  rubStart: boolean;
}

export async function getPageAyahs(db: SqlDb, page: number): Promise<PageAyah[]> {
  const rows = await db.getAllAsync<{
    id: number; surah: number; ayah: number; text: string; juz: number; hizb: number; page: number; sajdah: number; rub_start: number;
  }>(
    `SELECT a.id, a.surah, a.ayah, a.text, a.juz, a.hizb, a.page, a.sajdah,
            (a.id = (SELECT MIN(b.id) FROM ayahs b WHERE b.rub = a.rub)) AS rub_start
     FROM ayahs a WHERE a.page = ? ORDER BY a.id`,
    page,
  );
  return rows.map((r) => ({ ...r, sajdah: r.sajdah === 1, rubStart: r.rub_start === 1 && !(r.surah === 1 && r.ayah === 1) }));
}

export async function getAyahPage(db: SqlDb, surah: number, ayah: number): Promise<number> {
  const r = await db.getFirstAsync<{ page: number }>('SELECT page FROM ayahs WHERE surah = ? AND ayah = ?', surah, ayah);
  return r?.page ?? 1;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function toArabicDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

/** Display-only end-of-ayah ornament (U+06DD + Arabic-Indic digits); the stored text is unchanged. */
export function ayahMarker(ayah: number): string {
  return `۝${toArabicDigits(ayah)}`;
}
