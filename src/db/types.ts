export type SqlParam = string | number | null;

/**
 * The subset of expo-sqlite's SQLiteDatabase used by repositories. Tests provide a
 * node:sqlite-backed implementation so the same SQL is exercised in CI.
 */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlParam[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(source: string, ...params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
