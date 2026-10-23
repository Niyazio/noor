import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/store/kvStorage';
import { increment, initialCounter, reset, setTarget, undo, type CounterState } from './counter';

interface DhikrStore {
  counter: CounterState;
  tap: () => { reachedTarget: boolean };
  undo: () => void;
  reset: () => void;
  setTarget: (target: number | null) => void;
  /** Switches dhikr; returns the finished session (if any) so the caller can save it. */
  select: (dhikrId: string, target: number | null) => CounterState | null;
}

export const useDhikrStore = create<DhikrStore>()(
  persist(
    (set, get) => ({
      counter: initialCounter('subhanallah', 33),
      tap: () => {
        const r = increment(get().counter, Date.now());
        set({ counter: r.state });
        return { reachedTarget: r.reachedTarget };
      },
      undo: () => set({ counter: undo(get().counter, Date.now()) }),
      reset: () => set({ counter: reset(get().counter, Date.now()) }),
      setTarget: (target) => set({ counter: setTarget(get().counter, target) }),
      select: (dhikrId, target) => {
        const previous = get().counter;
        if (previous.dhikrId === dhikrId) return null;
        set({ counter: initialCounter(dhikrId, target) });
        return previous.count > 0 ? previous : null;
      },
    }),
    { name: 'noor.dhikr', version: 1, storage: createJSONStorage(() => kvStorage) },
  ),
);
