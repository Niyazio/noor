/* Noor web app service worker (offline support). Placeholders are filled by scripts/web/build-site.mjs. */
const CACHE = 'noor-__VERSION__';
const SCOPE = '__SCOPE__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('noor-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // App routes (e.g. /app/quran/2) are client-side: serve the app shell, network first.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(SCOPE + 'index.html', { cacheName: CACHE })),
    );
    return;
  }
  // Static assets are content-hashed: cache first, then network (and store).
  event.respondWith(
    caches.match(req, { cacheName: CACHE }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
