/**
 * Pure tasbeeh counter state machine. Persisted by the store after every change, so the
 * count survives app restarts and process death.
 */
export interface CounterState {
  dhikrId: string;
  count: number;
  target: number | null;
  /** Count before each recent tap/reset, newest last, for undo. */
  undoStack: number[];
  startedAt: number | null;
  lastChangedAt: number | null;
  /** Rounds completed in this session (count wraps to 0 when a target is reached). */
  rounds: number;
}

const UNDO_LIMIT = 50;

export function initialCounter(dhikrId: string, target: number | null): CounterState {
  return { dhikrId, count: 0, target, undoStack: [], startedAt: null, lastChangedAt: null, rounds: 0 };
}

export interface IncrementResult {
  state: CounterState;
  reachedTarget: boolean;
}

export function increment(s: CounterState, now: number): IncrementResult {
  const count = s.count + 1;
  const reachedTarget = s.target != null && s.target > 0 && count % s.target === 0;
  return {
    reachedTarget,
    state: {
      ...s,
      count,
      rounds: reachedTarget ? s.rounds + 1 : s.rounds,
      undoStack: [...s.undoStack, s.count].slice(-UNDO_LIMIT),
      startedAt: s.startedAt ?? now,
      lastChangedAt: now,
    },
  };
}

export function undo(s: CounterState, now: number): CounterState {
  if (!s.undoStack.length) return s;
  const prev = s.undoStack[s.undoStack.length - 1];
  const rounds = s.target && s.count > prev && s.count % s.target === 0 ? Math.max(0, s.rounds - 1) : s.rounds;
  return { ...s, count: prev, rounds, undoStack: s.undoStack.slice(0, -1), lastChangedAt: now };
}

export function reset(s: CounterState, now: number): CounterState {
  return { ...s, count: 0, rounds: 0, undoStack: s.count ? [...s.undoStack, s.count].slice(-UNDO_LIMIT) : s.undoStack, startedAt: null, lastChangedAt: now };
}

export function setTarget(s: CounterState, target: number | null): CounterState {
  return { ...s, target: target && target > 0 ? Math.floor(target) : null };
}

/** Progress (0–1) through the current round. */
export function roundProgress(s: Pick<CounterState, 'count' | 'target'>): number {
  if (!s.target) return 0;
  const inRound = s.count % s.target;
  return s.count > 0 && inRound === 0 ? 1 : inRound / s.target;
}
