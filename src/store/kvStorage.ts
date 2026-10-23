import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

/** Small key-value store (SQLite-backed, survives restarts, works offline). */
export const kvStorage: StateStorage = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
};
