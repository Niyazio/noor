import type { SqlDb } from '@/db/types';
import type { ObligatoryPrayer } from '@/features/prayer/types';

export interface Bookmark {
  id: number;
  ayahId: number;
  surah: number;
  ayah: number;
  collection: string;
  createdAt: number;
}

export interface Note {
  ayahId: number;
  surah: number;
  ayah: number;
  body: string;
  updatedAt: number;
}

export interface ReadingPosition {
  ayahId: number;
  surah: number;
  ayah: number;
  readAt: number;
}

export const DEFAULT_COLLECTION = 'Bookmarks';

// ---------------------------------------------------------------- bookmarks
export async function listBookmarks(db: SqlDb): Promise<Bookmark[]> {
  const rows = await db.getAllAsync<{ id: number; ayah_id: number; surah: number; ayah: number; collection: string; created_at: number }>(
    'SELECT * FROM bookmarks ORDER BY created_at DESC',
  );
  return rows.map((r) => ({ id: r.id, ayahId: r.ayah_id, surah: r.surah, ayah: r.ayah, collection: r.collection, createdAt: r.created_at }));
}

export async function bookmarkedAyahIds(db: SqlDb, surah: number): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ ayah_id: number }>('SELECT DISTINCT ayah_id FROM bookmarks WHERE surah = ?', surah);
  return new Set(rows.map((r) => r.ayah_id));
}

export async function addBookmark(
  db: SqlDb,
  ref: { ayahId: number; surah: number; ayah: number },
  collection = DEFAULT_COLLECTION,
  now = Date.now(),
): Promise<void> {
  await db.runAsync(
    `INSERT INTO bookmarks (ayah_id, surah, ayah, collection, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (ayah_id, collection) DO UPDATE SET updated_at = excluded.updated_at`,
    ref.ayahId, ref.surah, ref.ayah, collection.trim() || DEFAULT_COLLECTION, now, now,
  );
}

export async function removeBookmark(db: SqlDb, ayahId: number, collection?: string): Promise<void> {
  if (collection) await db.runAsync('DELETE FROM bookmarks WHERE ayah_id = ? AND collection = ?', ayahId, collection);
  else await db.runAsync('DELETE FROM bookmarks WHERE ayah_id = ?', ayahId);
}

// ---------------------------------------------------------------- notes
export async function getNote(db: SqlDb, ayahId: number): Promise<Note | null> {
  const r = await db.getFirstAsync<{ ayah_id: number; surah: number; ayah: number; body: string; updated_at: number }>(
    'SELECT * FROM notes WHERE ayah_id = ?', ayahId,
  );
  return r ? { ayahId: r.ayah_id, surah: r.surah, ayah: r.ayah, body: r.body, updatedAt: r.updated_at } : null;
}

export async function noteAyahIds(db: SqlDb, surah: number): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ ayah_id: number }>('SELECT ayah_id FROM notes WHERE surah = ?', surah);
  return new Set(rows.map((r) => r.ayah_id));
}

/** Saves a note; an empty body deletes it (explicit user action only). */
export async function saveNote(db: SqlDb, ref: { ayahId: number; surah: number; ayah: number }, body: string, now = Date.now()) {
  const text = body.trim();
  if (!text) {
    await db.runAsync('DELETE FROM notes WHERE ayah_id = ?', ref.ayahId);
    return;
  }
  await db.runAsync(
    `INSERT INTO notes (ayah_id, surah, ayah, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (ayah_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
    ref.ayahId, ref.surah, ref.ayah, text, now, now,
  );
}

// ---------------------------------------------------------------- reading
const HISTORY_LIMIT = 300;

/**
 * Records the reading position. Consecutive positions within the same surah within
 * 10 minutes update the latest row instead of adding noise to history.
 */
export async function recordReadingPosition(
  db: SqlDb,
  pos: { ayahId: number; surah: number; ayah: number },
  dateKey: string,
  now = Date.now(),
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const last = await db.getFirstAsync<{ id: number; surah: number; read_at: number }>(
      'SELECT id, surah, read_at FROM reading_history ORDER BY read_at DESC, id DESC LIMIT 1',
    );
    if (last && last.surah === pos.surah && now - last.read_at < 10 * 60_000) {
      await db.runAsync('UPDATE reading_history SET ayah_id = ?, ayah = ?, read_at = ? WHERE id = ?', pos.ayahId, pos.ayah, now, last.id);
    } else {
      await db.runAsync('INSERT INTO reading_history (ayah_id, surah, ayah, read_at) VALUES (?, ?, ?, ?)', pos.ayahId, pos.surah, pos.ayah, now);
      await db.runAsync(
        `DELETE FROM reading_history WHERE id NOT IN (SELECT id FROM reading_history ORDER BY read_at DESC, id DESC LIMIT ${HISTORY_LIMIT})`,
      );
    }
  });
  await markAyahsRead(db, [pos.ayahId], dateKey);
}

export async function markAyahsRead(db: SqlDb, ayahIds: number[], dateKey: string): Promise<void> {
  if (!ayahIds.length) return;
  const values = ayahIds.map(() => '(?, ?)').join(',');
  await db.runAsync(
    `INSERT OR IGNORE INTO ayah_reads (ayah_id, date_key) VALUES ${values}`,
    ...ayahIds.flatMap((id) => [id, dateKey]),
  );
}

export async function getLastRead(db: SqlDb): Promise<ReadingPosition | null> {
  const r = await db.getFirstAsync<{ ayah_id: number; surah: number; ayah: number; read_at: number }>(
    'SELECT ayah_id, surah, ayah, read_at FROM reading_history ORDER BY read_at DESC, id DESC LIMIT 1',
  );
  return r ? { ayahId: r.ayah_id, surah: r.surah, ayah: r.ayah, readAt: r.read_at } : null;
}

export async function getReadingHistory(db: SqlDb, limit = 30): Promise<ReadingPosition[]> {
  const rows = await db.getAllAsync<{ ayah_id: number; surah: number; ayah: number; read_at: number }>(
    'SELECT ayah_id, surah, ayah, read_at FROM reading_history ORDER BY read_at DESC, id DESC LIMIT ?', limit,
  );
  return rows.map((r) => ({ ayahId: r.ayah_id, surah: r.surah, ayah: r.ayah, readAt: r.read_at }));
}

export async function clearReadingHistory(db: SqlDb): Promise<void> {
  await db.execAsync('DELETE FROM reading_history; DELETE FROM ayah_reads;');
}

export async function ayahsReadOn(db: SqlDb, dateKey: string): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ayah_reads WHERE date_key = ?', dateKey);
  return r?.n ?? 0;
}

/** Distinct ayahs ever read — used for Khatm progress. */
export async function distinctAyahsRead(db: SqlDb): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(DISTINCT ayah_id) AS n FROM ayah_reads');
  return r?.n ?? 0;
}

// ---------------------------------------------------------------- prayer log
export async function getPrayerLog(db: SqlDb, dateKey: string): Promise<Partial<Record<ObligatoryPrayer, 'prayed' | 'missed'>>> {
  const rows = await db.getAllAsync<{ prayer: ObligatoryPrayer; status: 'prayed' | 'missed' }>(
    'SELECT prayer, status FROM prayer_log WHERE date_key = ?', dateKey,
  );
  return Object.fromEntries(rows.map((r) => [r.prayer, r.status]));
}

export async function setPrayerStatus(
  db: SqlDb, dateKey: string, prayer: ObligatoryPrayer, status: 'prayed' | 'missed' | null, now = Date.now(),
): Promise<void> {
  if (status === null) {
    await db.runAsync('DELETE FROM prayer_log WHERE date_key = ? AND prayer = ?', dateKey, prayer);
    return;
  }
  await db.runAsync(
    `INSERT INTO prayer_log (date_key, prayer, status, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (date_key, prayer) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    dateKey, prayer, status, now,
  );
}

// ---------------------------------------------------------------- search history
export async function addSearchHistory(db: SqlDb, query: string, now = Date.now()) {
  const q = query.trim();
  if (q.length < 2) return;
  await db.runAsync(
    'INSERT INTO search_history (query, searched_at) VALUES (?, ?) ON CONFLICT (query) DO UPDATE SET searched_at = excluded.searched_at',
    q, now,
  );
  await db.runAsync('DELETE FROM search_history WHERE query NOT IN (SELECT query FROM search_history ORDER BY searched_at DESC LIMIT 20)');
}

export async function getSearchHistory(db: SqlDb): Promise<string[]> {
  const rows = await db.getAllAsync<{ query: string }>('SELECT query FROM search_history ORDER BY searched_at DESC LIMIT 20');
  return rows.map((r) => r.query);
}

export async function clearSearchHistory(db: SqlDb) {
  await db.execAsync('DELETE FROM search_history');
}
