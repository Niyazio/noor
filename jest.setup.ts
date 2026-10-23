// In-memory replacement for the SQLite-backed key-value store used by zustand persist.
jest.mock('expo-sqlite/kv-store', () => {
  const map = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => map.get(k) ?? null,
      setItem: async (k: string, v: string) => void map.set(k, v),
      removeItem: async (k: string) => void map.delete(k),
    },
  };
});
