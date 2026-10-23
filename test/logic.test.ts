import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { migrateUserDb, USER_MIGRATIONS } from '@/db/userMigrations';
import { increment, initialCounter, reset, roundProgress, setTarget, undo } from '@/features/dhikr/counter';
import { dhikrTotals, saveCustomDhikr, listCustomDhikr, saveSession } from '@/features/dhikr/repository';
import { DHIKR_PRESETS } from '@/features/dhikr/presets';
import { calculateRange } from '@/features/prayer/engine';
import { DEFAULT_PRAYER_SETTINGS } from '@/features/prayer/types';
import { diffSchedule, inQuietHours, MAX_PENDING_PRAYER_NOTIFICATIONS, planPrayerNotifications } from '@/features/notifications/plan';
import { normalizeArabic, normalizeLatin, normalizeQuery } from '@/features/quran/normalize';
import {
  addBookmark, ayahsReadOn, distinctAyahsRead, getLastRead, getNote, getPrayerLog, getReadingHistory,
  listBookmarks, recordReadingPosition, removeBookmark, saveNote, setPrayerStatus,
} from '@/features/userdata/repository';
import { DEFAULT_SETTINGS } from '@/store/settings';
import { openNodeDb } from './nodeSqlite';

describe('search normalisation', () => {
  it('strips Quranic marks and folds letter variants', () => {
    expect(normalizeArabic('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ')).toBe('بسم الله الرحمن الرحيم');
    expect(normalizeArabic('إِنَّ')).toBe('ان');
    expect(normalizeArabic('لَهُۥ')).toBe('له');
  });
  it('folds Latin case and diacritics', () => {
    expect(normalizeLatin('Ibrāhīm')).toBe('ibrahim');
    expect(normalizeQuery('  Al-Fātiḥa ')).toBe('al-fatiha');
  });
});

describe('user database', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'noor-')), 'noor.db');

  it('migrates idempotently', async () => {
    const db = openNodeDb(file);
    expect(await migrateUserDb(db)).toBe(USER_MIGRATIONS.length);
    expect(await migrateUserDb(db)).toBe(USER_MIGRATIONS.length);
    db.close();
  });

  it('persists bookmarks, notes and reading position across restarts', async () => {
    let db = openNodeDb(file);
    await migrateUserDb(db);
    await addBookmark(db, { ayahId: 262, surah: 2, ayah: 255 }, undefined, 1000);
    await addBookmark(db, { ayahId: 262, surah: 2, ayah: 255 }, undefined, 2000); // no duplicate
    await addBookmark(db, { ayahId: 262, surah: 2, ayah: 255 }, 'Memorise', 3000);
    await saveNote(db, { ayahId: 262, surah: 2, ayah: 255 }, '  Ayat al-Kursi  ', 1000);
    await recordReadingPosition(db, { ayahId: 300, surah: 3, ayah: 7 }, '2026-10-23', 1_000_000);
    db.close();

    db = openNodeDb(file); // simulated app restart
    await migrateUserDb(db);
    const bms = await listBookmarks(db);
    expect(bms).toHaveLength(2);
    expect(bms.map((b) => b.collection).sort()).toEqual(['Bookmarks', 'Memorise']);
    expect((await getNote(db, 262))?.body).toBe('Ayat al-Kursi');
    expect(await getLastRead(db)).toMatchObject({ ayahId: 300, surah: 3, ayah: 7 });

    await removeBookmark(db, 262, 'Memorise');
    expect(await listBookmarks(db)).toHaveLength(1);
    await saveNote(db, { ayahId: 262, surah: 2, ayah: 255 }, '   ');
    expect(await getNote(db, 262)).toBeNull();
    db.close();
  });

  it('coalesces reading history within a session and never loses the newest position', async () => {
    const db = openNodeDb();
    await migrateUserDb(db);
    const t0 = 5_000_000;
    await recordReadingPosition(db, { ayahId: 8, surah: 2, ayah: 1 }, 'd1', t0);
    await recordReadingPosition(db, { ayahId: 9, surah: 2, ayah: 2 }, 'd1', t0 + 60_000);
    await recordReadingPosition(db, { ayahId: 10, surah: 2, ayah: 3 }, 'd1', t0 + 120_000);
    expect(await getReadingHistory(db)).toHaveLength(1);
    expect(await getLastRead(db)).toMatchObject({ ayahId: 10 });
    await recordReadingPosition(db, { ayahId: 1, surah: 1, ayah: 1 }, 'd2', t0 + 999_000_000);
    expect(await getReadingHistory(db)).toHaveLength(2);
    expect(await ayahsReadOn(db, 'd1')).toBe(3);
    expect(await distinctAyahsRead(db)).toBe(4);
    db.close();
  });

  it('records and clears prayer status', async () => {
    const db = openNodeDb();
    await migrateUserDb(db);
    await setPrayerStatus(db, '2026-10-23', 'fajr', 'prayed');
    await setPrayerStatus(db, '2026-10-23', 'asr', 'prayed');
    await setPrayerStatus(db, '2026-10-23', 'asr', null);
    expect(await getPrayerLog(db, '2026-10-23')).toEqual({ fajr: 'prayed' });
    db.close();
  });

  it('stores custom dhikr and session statistics', async () => {
    const db = openNodeDb();
    await migrateUserDb(db);
    await saveCustomDhikr(db, { id: 'c1', title: ' Morning ', arabic: null, notes: null, target: 0, favorite: true });
    await expect(saveCustomDhikr(db, { id: 'c2', title: '  ', arabic: null, notes: null, target: 10, favorite: false })).rejects.toThrow();
    expect(await listCustomDhikr(db)).toMatchObject([{ id: 'c1', title: 'Morning', target: null, favorite: true }]);
    await saveSession(db, { dhikrId: 'subhanallah', count: 33, target: 33, startedAt: 1, endedAt: 2, dateKey: '2026-10-23' });
    await saveSession(db, { dhikrId: 'subhanallah', count: 10, target: 33, startedAt: 3, endedAt: 4, dateKey: '2026-10-24' });
    await saveSession(db, { dhikrId: 'subhanallah', count: 0, target: 33, startedAt: 3, endedAt: 4, dateKey: '2026-10-24' });
    expect(await dhikrTotals(db, '2026-10-23', '2026-10-24')).toEqual([{ dhikr_id: 'subhanallah', total: 43, sessions: 2 }]);
    db.close();
  });
});

describe('tasbeeh counter', () => {
  it('counts, completes rounds, undoes and resets', () => {
    let s = initialCounter('subhanallah', 3);
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = increment(s, i);
      hits.push(r.reachedTarget);
      s = r.state;
    }
    expect(s.count).toBe(4);
    expect(hits).toEqual([false, false, true, false]);
    expect(s.rounds).toBe(1);
    expect(roundProgress(s)).toBeCloseTo(1 / 3);
    s = undo(s, 10);
    expect(s.count).toBe(3);
    expect(roundProgress(s)).toBe(1);
    s = undo(s, 11);
    expect(s).toMatchObject({ count: 2, rounds: 0 });
    s = reset(s, 12);
    expect(s.count).toBe(0);
    s = undo(s, 13); // reset is undoable
    expect(s.count).toBe(2);
    expect(setTarget(s, -5).target).toBeNull();
  });

  it('has complete presets', () => {
    for (const p of DHIKR_PRESETS) {
      expect(p.arabic).toMatch(/[؀-ۿ]/);
      expect(p.translation.length).toBeGreaterThan(3);
    }
    expect(new Set(DHIKR_PRESETS.map((p) => p.id)).size).toBe(DHIKR_PRESETS.length);
  });
});

describe('prayer notification planning', () => {
  const loc = { latitude: 12.97, longitude: 77.56, timezone: 'Asia/Kolkata' };
  const now = new Date(Date.UTC(2026, 9, 23, 6, 0)); // 11:30 IST
  const days = calculateRange(loc, DEFAULT_PRAYER_SETTINGS, now, 7);
  const base = DEFAULT_SETTINGS.notifications;

  it('schedules only future, enabled prayers, sorted, with unique ids', () => {
    const plan = planPrayerNotifications(days, base, loc.timezone, now);
    expect(plan.every((n) => n.fireDate > now)).toBe(true);
    expect(plan.some((n) => n.prayer === 'sunrise')).toBe(false); // off by default
    expect(new Set(plan.map((n) => n.id)).size).toBe(plan.length);
    const times = plan.map((n) => n.fireDate.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(plan[0].prayer).toBe('dhuhr');
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING_PRAYER_NOTIFICATIONS);
  });

  it('respects per-prayer modes and reminders, within the platform limit', () => {
    const settings = {
      ...base,
      prayers: { ...base.prayers, asr: { mode: 'off' as const, reminderMinutes: null }, fajr: { mode: 'vibrate' as const, reminderMinutes: 15 } },
    };
    const plan = planPrayerNotifications(days, settings, loc.timezone, now);
    expect(plan.some((n) => n.prayer === 'asr')).toBe(false);
    const fajr = plan.filter((n) => n.prayer === 'fajr');
    const reminder = fajr.find((n) => n.kind === 'reminder')!;
    const atTime = fajr.find((n) => n.kind === 'at-time' && n.id.split('.')[2] === reminder.id.split('.')[2])!;
    expect(atTime.channelId).toBe('prayer-vibrate-v1');
    expect((atTime.fireDate.getTime() - reminder.fireDate.getTime()) / 60_000).toBe(15);
    expect(planPrayerNotifications(days, settings, loc.timezone, now, 10)).toHaveLength(10);
  });

  it('downgrades sound to silent during quiet hours instead of skipping', () => {
    const settings = { ...base, quietHours: { enabled: true, start: '03:00', end: '06:00' } };
    const fajr = planPrayerNotifications(days, settings, loc.timezone, now).filter((n) => n.prayer === 'fajr');
    expect(fajr.length).toBeGreaterThan(0);
    expect(fajr.every((n) => n.mode === 'silent')).toBe(true);
    expect(inQuietHours(new Date(Date.UTC(2026, 9, 23, 18, 0)), 'Asia/Kolkata', { enabled: true, start: '23:00', end: '05:00' })).toBe(true); // 23:30 IST
  });

  it('diffs against pending notifications so rescheduling never duplicates', () => {
    const plan = planPrayerNotifications(days, base, loc.timezone, now);
    const pending = plan.map((n) => ({ id: n.id, fireTime: n.fireDate.getTime() }));
    expect(diffSchedule(plan, pending)).toEqual({ toCancel: [], toSchedule: [] });

    const moved = [{ ...pending[0], fireTime: pending[0].fireTime + 5 * 60_000 }, ...pending.slice(1)];
    const obsolete = [...pending, { id: 'noor.prayer.2020-01-01.fajr.at', fireTime: 1 }, { id: 'other.app', fireTime: 1 }];
    expect(diffSchedule(plan, moved)).toEqual({ toCancel: [plan[0].id], toSchedule: [plan[0]] });
    expect(diffSchedule(plan, obsolete)).toEqual({ toCancel: ['noor.prayer.2020-01-01.fajr.at'], toSchedule: [] });
    expect(diffSchedule([], pending).toCancel).toHaveLength(pending.length);
  });
});

describe('Azan alerts', () => {
  const { adhanChannelId } = jest.requireActual('@/features/notifications/plan') as typeof import('@/features/notifications/plan');
  it('uses a channel per bundled sound so Android picks up a newly added recording', () => {
    expect(adhanChannelId(null)).toBe('prayer-adhan-default-v1');
    expect(adhanChannelId('adhan.mp3')).toBe('prayer-adhan-adhan_mp3-v1');
  });
  it('routes Azan-mode prayers to the Azan channel by default', () => {
    const loc = { latitude: 12.97, longitude: 77.56, timezone: 'Asia/Kolkata' };
    const now = new Date(Date.UTC(2026, 9, 23, 6, 0));
    const plan = planPrayerNotifications(calculateRange(loc, DEFAULT_PRAYER_SETTINGS, now, 1), DEFAULT_SETTINGS.notifications, loc.timezone, now, 56, adhanChannelId('adhan.mp3'));
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((n) => n.mode === 'adhan' && n.channelId === 'prayer-adhan-adhan_mp3-v1')).toBe(true);
  });
});
