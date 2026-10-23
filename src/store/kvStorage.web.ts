import type { StateStorage } from 'zustand/middleware';

/** Web key-value store for settings: localStorage (no cross-origin isolation required). */
export const kvStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or disabled (private mode): settings stay in memory for this session.
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
