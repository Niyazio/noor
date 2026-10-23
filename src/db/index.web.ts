/**
 * Web implementation of the database layer (used by the installable web app for iPhone/PC).
 *
 * expo-sqlite's web worker needs SharedArrayBuffer (cross-origin-isolation headers), which
 * most static hosts and iOS home-screen apps cannot provide. sql.js runs SQLite as plain
 * WebAssembly on the main thread instead. Content is read-only; personal data is
 * persisted to IndexedDB after each write.
 */
import { Asset } from 'expo-asset';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import type { SqlDb, SqlParam } from './types';
import { migrateUserDb } from './userMigrations';

export class ContentIntegrityError extends Error {}

let contentDb: SqlDb | null = null;
let userDb: SqlDb | null = null;
let opening: Promise<void> | null = null;

const IDB_NAME = 'noor';
const IDB_STORE = 'files';
const USER_KEY = 'noor.db';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: Uint8Array): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function rows<T>(db: Database, sql: string, params: SqlParam[]): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as SqlValue[]);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    return out;
  } finally {
    stmt.free();
  }
}

function wrap(db: Database, onWrite?: () => void): SqlDb {
  let depth = 0;
  const changed = () => {
    if (depth === 0) onWrite?.();
  };
  return {
    async execAsync(sql) {
      db.exec(sql);
      changed();
    },
    async runAsync(sql, ...params) {
      db.run(sql, params as SqlValue[]);
      const changes = db.getRowsModified();
      const id = rows<{ id: number }>(db, 'SELECT last_insert_rowid() AS id', [])[0]?.id ?? 0;
      changed();
      return { lastInsertRowId: Number(id), changes };
    },
    async getAllAsync<T>(sql: string, ...params: SqlParam[]) {
      return rows<T>(db, sql, params);
    },
    async getFirstAsync<T>(sql: string, ...params: SqlParam[]) {
      return rows<T>(db, sql, params)[0] ?? null;
    },
    async withTransactionAsync(task) {
      const outer = depth === 0;
      if (outer) db.exec('BEGIN');
      depth++;
      try {
        await task();
        depth--;
        if (outer) {
          db.exec('COMMIT');
          changed();
        }
      } catch (e) {
        depth--;
        if (outer) db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

async function fetchAsset(moduleId: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(moduleId);
  const res = await fetch(asset.uri);
  if (!res.ok) throw new Error(`Failed to load ${asset.uri}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function openDatabases(): Promise<void> {
  if (!opening) {
    opening = (async () => {
      const wasmUrl = Asset.fromModule(require('sql.js/dist/sql-wasm-browser.wasm')).uri;
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });

      const content = wrap(new SQL.Database(await fetchAsset(require('../../assets/content/content.db'))));
      await verifyContentDb(content);
      contentDb = content;

      const saved = await idbGet(USER_KEY).catch(() => null);
      const raw = saved ? new SQL.Database(saved) : new SQL.Database();
      let timer: ReturnType<typeof setTimeout> | null = null;
      const persist = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void idbPut(USER_KEY, raw.export()).catch(() => undefined), 300);
      };
      const user = wrap(raw, persist);
      await migrateUserDb(user);
      userDb = user;
      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', () => void idbPut(USER_KEY, raw.export()).catch(() => undefined));
      }
    })().catch((e) => {
      opening = null;
      throw e;
    });
  }
  return opening;
}

export async function verifyContentDb(db: SqlDb): Promise<void> {
  const version = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'content_version'");
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ayahs');
  if (version?.value !== CONTENT_MANIFEST.contentVersion || count?.n !== CONTENT_MANIFEST.totalAyahs) {
    throw new ContentIntegrityError(`Content DB mismatch (version ${version?.value}, ${count?.n} ayahs)`);
  }
}

export function getContentDb(): SqlDb {
  if (!contentDb) throw new Error('Content database not opened');
  return contentDb;
}

export function getUserDb(): SqlDb {
  if (!userDb) throw new Error('User database not opened');
  return userDb;
}

export function __setDatabasesForTests(content: SqlDb | null, user: SqlDb | null) {
  contentDb = content;
  userDb = user;
}
