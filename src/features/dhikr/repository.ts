import type { SqlDb } from '@/db/types';

export interface CustomDhikr {
  id: string;
  title: string;
  arabic: string | null;
  notes: string | null;
  target: number | null;
  favorite: boolean;
  createdAt: number;
}

export async function listCustomDhikr(db: SqlDb): Promise<CustomDhikr[]> {
  const rows = await db.getAllAsync<{ id: string; title: string; arabic: string | null; notes: string | null; target: number | null; favorite: number; created_at: number }>(
    'SELECT * FROM custom_dhikr ORDER BY favorite DESC, created_at DESC',
  );
  return rows.map((r) => ({ id: r.id, title: r.title, arabic: r.arabic, notes: r.notes, target: r.target, favorite: r.favorite === 1, createdAt: r.created_at }));
}

export async function saveCustomDhikr(db: SqlDb, d: Omit<CustomDhikr, 'createdAt'> & { createdAt?: number }) {
  const title = d.title.trim();
  if (!title) throw new Error('Title is required');
  await db.runAsync(
    `INSERT INTO custom_dhikr (id, title, arabic, notes, target, favorite, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, arabic = excluded.arabic, notes = excluded.notes,
       target = excluded.target, favorite = excluded.favorite`,
    d.id, title, d.arabic?.trim() || null, d.notes?.trim() || null, d.target && d.target > 0 ? d.target : null,
    d.favorite ? 1 : 0, d.createdAt ?? Date.now(),
  );
}

export async function deleteCustomDhikr(db: SqlDb, id: string) {
  await db.runAsync('DELETE FROM custom_dhikr WHERE id = ?', id);
}

export async function saveSession(
  db: SqlDb,
  s: { dhikrId: string; count: number; target: number | null; startedAt: number; endedAt: number; dateKey: string },
) {
  if (s.count <= 0) return;
  await db.runAsync(
    'INSERT INTO dhikr_sessions (dhikr_id, count, target, date_key, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)',
    s.dhikrId, s.count, s.target, s.dateKey, s.startedAt, s.endedAt,
  );
}

export async function dhikrTotals(db: SqlDb, fromDateKey: string, toDateKey: string) {
  return db.getAllAsync<{ dhikr_id: string; total: number; sessions: number }>(
    `SELECT dhikr_id, SUM(count) AS total, COUNT(*) AS sessions FROM dhikr_sessions
     WHERE date_key BETWEEN ? AND ? GROUP BY dhikr_id ORDER BY total DESC`,
    fromDateKey, toDateKey,
  );
}

export async function recentSessions(db: SqlDb, limit = 20) {
  return db.getAllAsync<{ id: number; dhikr_id: string; count: number; target: number | null; date_key: string; ended_at: number }>(
    'SELECT id, dhikr_id, count, target, date_key, ended_at FROM dhikr_sessions ORDER BY ended_at DESC LIMIT ?', limit,
  );
}
