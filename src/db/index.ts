import * as SQLite from 'expo-sqlite';

import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import type { SqlDb } from './types';
import { migrateUserDb } from './userMigrations';

const CONTENT_DB_NAME = `content-${CONTENT_MANIFEST.contentVersion}.db`;
const USER_DB_NAME = 'noor.db';

let contentDb: SqlDb | null = null;
let userDb: SqlDb | null = null;
let opening: Promise<void> | null = null;

export class ContentIntegrityError extends Error {}

/**
 * Opens both databases once. The content DB is copied from the app bundle on first run
 * of each content version; older versions are removed.
 */
export function openDatabases(): Promise<void> {
  if (!opening) {
    opening = (async () => {
      await SQLite.importDatabaseFromAssetAsync(CONTENT_DB_NAME, {
        assetId: require('../../assets/content/content.db'),
      });
      const content = await SQLite.openDatabaseAsync(CONTENT_DB_NAME);
      await verifyContentDb(content);
      contentDb = content;

      const user = await SQLite.openDatabaseAsync(USER_DB_NAME);
      await migrateUserDb(user);
      userDb = user;

      removeStaleContentDbs().catch(() => undefined);
    })().catch((e) => {
      opening = null;
      throw e;
    });
  }
  return opening;
}

/** Fast startup check; the full text checksum is verified in tests and on the Sources screen. */
export async function verifyContentDb(db: SqlDb): Promise<void> {
  const version = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'content_version'");
  const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ayahs');
  if (version?.value !== CONTENT_MANIFEST.contentVersion || count?.n !== CONTENT_MANIFEST.totalAyahs) {
    throw new ContentIntegrityError(
      `Content DB mismatch (version ${version?.value}, ${count?.n} ayahs)`,
    );
  }
}

async function removeStaleContentDbs() {
  const { Directory } = await import('expo-file-system');
  const location = String(SQLite.defaultDatabaseDirectory);
  const dir = new Directory(location.startsWith('file:') ? location : `file://${location}`);
  if (!dir.exists) return;
  for (const entry of dir.list()) {
    if (/^content-[0-9a-f]+\.db/.test(entry.name) && !entry.name.startsWith(CONTENT_DB_NAME)) {
      entry.delete();
    }
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

/** Test hook. */
export function __setDatabasesForTests(content: SqlDb | null, user: SqlDb | null) {
  contentDb = content;
  userDb = user;
}
