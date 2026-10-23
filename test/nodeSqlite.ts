import { DatabaseSync } from 'node:sqlite';

import type { SqlDb, SqlParam } from '@/db/types';

/** node:sqlite-backed implementation of the SqlDb interface used in tests. */
export function openNodeDb(path = ':memory:', readOnly = false): SqlDb & { close(): void } {
  const db = new DatabaseSync(path, { readOnly });
  let depth = 0;
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, ...params: SqlParam[]) {
      const r = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, ...params: SqlParam[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: SqlParam[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      const outer = depth === 0;
      if (outer) db.exec('BEGIN');
      depth++;
      try {
        await task();
        depth--;
        if (outer) db.exec('COMMIT');
      } catch (e) {
        depth--;
        if (outer) db.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      db.close();
    },
  };
}
