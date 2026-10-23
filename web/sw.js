/* Noor web app service worker (offline support). Placeholders are filled by scripts/web/build-site.mjs. */
const CACHE = 'noor-__VERSION__';
const SCOPE = '__SCOPE__'; // app path, e.g. /app/
const SITE = '__SITE__'; // site root, e.g. /
// eslint-disable-next-line no-undef -- replaced with a JSON array at build time
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
  // Pages: network first; offline, app routes (e.g. /app/quran/2) get the app shell and the
  // download page gets its cached copy.
  if (req.mode === 'navigate') {
    const inApp = new URL(req.url).pathname.startsWith(SCOPE);
    event.respondWith(
      fetch(req).catch(() => caches.match(inApp ? SCOPE + 'index.html' : SITE, { cacheName: CACHE })),
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
