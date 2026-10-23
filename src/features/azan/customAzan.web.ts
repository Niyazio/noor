/** User-chosen Azan recording for the web app, stored in IndexedDB on this device only. */
const DB = 'noor';
const STORE = 'files';
const KEY = 'azan';

export const customAzanSupported = true;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let cachedUrl: { name: string; url: string } | null = null;

export async function getCustomAzan(): Promise<{ name: string; url: string } | null> {
  if (cachedUrl) return cachedUrl;
  const db = await open();
  const rec = await new Promise<{ name: string; blob: Blob } | undefined>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as { name: string; blob: Blob } | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!rec) return null;
  cachedUrl = { name: rec.name, url: URL.createObjectURL(rec.blob) };
  return cachedUrl;
}

export async function saveCustomAzan(blob: Blob, name: string): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ name, blob }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (cachedUrl) URL.revokeObjectURL(cachedUrl.url);
  cachedUrl = null;
}

export async function removeCustomAzan(): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (cachedUrl) URL.revokeObjectURL(cachedUrl.url);
  cachedUrl = null;
}
