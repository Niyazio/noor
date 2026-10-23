/**
 * Builds the public download website + installable web app (PWA):
 *
 *   node scripts/web/build-site.mjs
 *
 * Env:
 *   SITE_BASE  path prefix the site is served under ("" for a domain root, "/noor" for GitHub Pages)
 *   APK_PATH   optional path to a built Android APK to publish at /downloads/noor.apk (≤25 MiB on Cloudflare)
 *   APK_URL    optional external APK link (e.g. GitHub Releases); takes precedence over APK_PATH
 *
 * Output: dist/site/ (upload anywhere static) and dist/noor-website.zip
 *   /                     download page (detects Android / iPhone / PC)
 *   /app/                 web app (installable, offline after first load)
 *   /downloads/           noor.apk (if provided), noor-source.zip
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const base = (process.env.SITE_BASE ?? '').replace(/\/$/, '');
const out = path.join(root, 'dist/site');
const appDir = path.join(out, 'app');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'src/config/brand.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });

fs.rmSync(out, { recursive: true, force: true });

// 1. Web app under /app
run(`npx expo export --platform web --output-dir "${appDir}"`, { EXPO_BASE_URL: `${base}/app`, CI: '1' });

// 2. Icons + manifest
fs.cpSync(path.join(root, 'web/icons'), path.join(appDir, 'icons'), { recursive: true });
const scope = `${base}/app/`;
// One manifest + service worker for the whole site, so installing from the download page installs
// the app (start_url /app/) instead of creating a browser bookmark.
const siteScope = `${base}/`;
fs.writeFileSync(
  path.join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: `${brand.appName} — ${brand.tagline}`,
      short_name: brand.appName,
      id: scope,
      start_url: scope,
      scope: siteScope,
      display: 'standalone',
      orientation: 'portrait',
      background_color: brand.colors.ivory,
      theme_color: brand.colors.emerald,
      icons: [
        { src: `${scope}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${scope}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${scope}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);

// 3. Service worker with a precache list (skip icon fonts the app does not use).
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(path.relative(appDir, p).split(path.sep).join('/'));
  }
};
walk(appDir);
const precache = files
  .filter((f) => !/vector-icons\/.*Fonts\/(?!Ionicons)/.test(f))
  .filter((f) => !/(^|\/)(metadata\.json|sw\.js|404\.html)$/.test(f))
  .map((f) => `${scope}${f}`)
  .concat([siteScope]);
const version = `${pkg.version}-${Date.now().toString(36)}`;
fs.writeFileSync(
  path.join(out, 'sw.js'),
  fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8')
    .replaceAll('__VERSION__', version)
    .replaceAll('__SCOPE__', scope)
    .replaceAll('__SITE__', siteScope)
    .replaceAll('__PRECACHE__', JSON.stringify(precache)),
);

// 4. PWA / iOS tags in the app shell
const indexPath = path.join(appDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const head = `
    <link rel="manifest" href="${siteScope}manifest.webmanifest" />
    <meta name="theme-color" content="${brand.colors.emerald}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${brand.appName}" />
    <link rel="apple-touch-icon" href="${scope}icons/apple-touch-icon.png" />
    <script>if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('${siteScope}sw.js', { scope: '${siteScope}' }).catch(function () {}); });</script>
  </head>`;
html = html.replace('</head>', head).replace(/<title>[^<]*<\/title>/, `<title>${brand.appName}</title>`);
html = html.replace('content="width=device-width, initial-scale=1, shrink-to-fit=no"', 'content="width=device-width, initial-scale=1, viewport-fit=cover"');
fs.writeFileSync(indexPath, html);

// 5. Downloads
const downloads = path.join(out, 'downloads');
fs.mkdirSync(downloads, { recursive: true });
run(`git archive --format=zip -o "${path.join(downloads, 'noor-source.zip')}" HEAD`);
let hasApk = false;
let apkSize = '';
// APK_URL links to an APK hosted elsewhere (e.g. GitHub Releases): Cloudflare Pages caps files at 25 MiB.
let apkUrl = `${base}/downloads/noor.apk`;
if (process.env.APK_URL) {
  apkUrl = process.env.APK_URL;
  hasApk = true;
} else if (process.env.APK_PATH && fs.existsSync(process.env.APK_PATH)) {
  fs.copyFileSync(process.env.APK_PATH, path.join(downloads, 'noor.apk'));
  hasApk = true;
  apkSize = ` (${Math.round(fs.statSync(process.env.APK_PATH).size / 1048576)} MB)`;
}

// 6. Download page
fs.writeFileSync(
  path.join(out, 'index.html'),
  fs.readFileSync(path.join(root, 'web/landing/index.html'), 'utf8')
    .replaceAll('{{BASE}}', base)
    .replaceAll('{{APK_URL}}', apkUrl)
    .replaceAll('{{APK_SIZE}}', apkSize)
    .replaceAll('{{HAS_APK}}', String(hasApk))
    .replaceAll('{{VERSION}}', pkg.version),
);

// 7. Host configuration: deep links into the app must serve the app shell.
// Deep links such as /app/quran/2 are client-side routes. Cloudflare Pages (and Netlify, GitHub
// Pages) serve the nearest 404.html for unknown paths, so the app shell doubles as app/404.html.
// A `/app/*` rewrite in _redirects is deliberately avoided: it could shadow real asset files.
fs.copyFileSync(indexPath, path.join(appDir, '404.html'));
fs.writeFileSync(
  path.join(out, 'vercel.json'),
  JSON.stringify(
    {
      rewrites: [{ source: '/app/:path((?!.*\\.).*)', destination: '/app/index.html' }],
      headers: [
        { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
        { source: '/downloads/(.*).apk', headers: [{ key: 'Content-Type', value: 'application/vnd.android.package-archive' }] },
      ],
    },
    null,
    2,
  ),
);
// Cloudflare Pages / Netlify response headers.
fs.writeFileSync(
  path.join(out, '_headers'),
  `${base}/sw.js\n  Cache-Control: no-cache\n${base}/manifest.webmanifest\n  Content-Type: application/manifest+json\n${base}/downloads/*.apk\n  Content-Type: application/vnd.android.package-archive\n  Content-Disposition: attachment; filename="noor.apk"\n`,
);
fs.copyFileSync(indexPath, path.join(out, '404.html')); // GitHub Pages fallback for deep links
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// 8. Zip for drag-and-drop hosting
const zip = path.join(root, 'dist/noor-website.zip');
fs.rmSync(zip, { force: true });
execSync(`cd "${out}" && zip -qr "${zip}" .`);
console.log(`\nSite ready: ${out}\nZip: ${zip}\nAPK included: ${hasApk}`);
