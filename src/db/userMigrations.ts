import type { SqlDb } from './types';

/**
 * Personal data lives in noor.db, separate from the replaceable content database, so a
 * content update can never touch bookmarks, notes or history. Migrations are append-only.
 */
export const USER_MIGRATIONS: readonly string[] = [
  // 1 — initial schema
  `
  CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_id INTEGER NOT NULL,
    surah INTEGER NOT NULL,
    ayah INTEGER NOT NULL,
    collection TEXT NOT NULL DEFAULT 'Bookmarks',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (ayah_id, collection)
  );
  CREATE TABLE notes (
    ayah_id INTEGER PRIMARY KEY,
    surah INTEGER NOT NULL,
    ayah INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_id INTEGER NOT NULL,
    surah INTEGER NOT NULL,
    ayah INTEGER NOT NULL,
    read_at INTEGER NOT NULL
  );
  CREATE INDEX reading_history_read_at ON reading_history (read_at DESC);
  CREATE TABLE ayah_reads (
    ayah_id INTEGER NOT NULL,
    date_key TEXT NOT NULL,
    PRIMARY KEY (ayah_id, date_key)
  ) WITHOUT ROWID;
  CREATE INDEX ayah_reads_date ON ayah_reads (date_key);
  CREATE TABLE custom_dhikr (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    arabic TEXT,
    notes TEXT,
    target INTEGER,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE dhikr_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dhikr_id TEXT NOT NULL,
    count INTEGER NOT NULL,
    target INTEGER,
    date_key TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL
  );
  CREATE INDEX dhikr_sessions_date ON dhikr_sessions (date_key);
  CREATE TABLE prayer_log (
    date_key TEXT NOT NULL,
    prayer TEXT NOT NULL CHECK (prayer IN ('fajr','dhuhr','asr','maghrib','isha')),
    status TEXT NOT NULL CHECK (status IN ('prayed','missed')),
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (date_key, prayer)
  ) WITHOUT ROWID;
  CREATE TABLE search_history (
    query TEXT PRIMARY KEY,
    searched_at INTEGER NOT NULL
  ) WITHOUT ROWID;
  `,
];

export async function migrateUserDb(db: SqlDb): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < USER_MIGRATIONS.length) {
    const sql = USER_MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
