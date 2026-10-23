/**
 * Renders the brand icon set from SVG with headless Chromium (Playwright).
 *   node scripts/brand/make-icons.mjs <path-to-playwright-module>
 * Outputs app icons into assets/ and web-app icons into web/icons/.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] ?? 'playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'src/config/brand.json'), 'utf8'));
const font = fs.readFileSync(path.join(root, 'node_modules/@expo-google-fonts/amiri-quran/400Regular/AmiriQuran_400Regular.ttf')).toString('base64');
const { emerald, navy, gold } = brand.colors;

// Eight-point star (two squares) with the wordmark, in a 1024 box; `scale` shrinks it for safe zones.
const mark = (color, scale = 1, textColor = color) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <rect x="262" y="262" width="500" height="500" rx="36" fill="none" stroke="${color}" stroke-width="34"/>
    <rect x="262" y="262" width="500" height="500" rx="36" fill="none" stroke="${color}" stroke-width="34" transform="rotate(45 512 512)"/>
    <text x="512" y="560" font-family="Amiri" font-size="250" text-anchor="middle" fill="${textColor}">نور</text>
  </g>`;
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${emerald}"/><stop offset="1" stop-color="${navy}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>`;

const variants = [
  { file: 'assets/icon.png', size: 1024, svg: bg + mark(gold, 0.95, '#FFFFFF') },
  { file: 'assets/android-icon-background.png', size: 1024, svg: bg },
  { file: 'assets/android-icon-foreground.png', size: 1024, svg: mark(gold, 0.62, '#FFFFFF'), transparent: true },
  { file: 'assets/android-icon-monochrome.png', size: 1024, svg: mark('#FFFFFF', 0.62), transparent: true },
  { file: 'assets/splash-icon.png', size: 1024, svg: mark(gold, 0.95), transparent: true },
  { file: 'assets/favicon.png', size: 48, svg: bg + mark(gold, 1.05, '#FFFFFF') },
  { file: 'web/icons/icon-192.png', size: 192, svg: bg + mark(gold, 0.95, '#FFFFFF') },
  { file: 'web/icons/icon-512.png', size: 512, svg: bg + mark(gold, 0.95, '#FFFFFF') },
  { file: 'web/icons/maskable-512.png', size: 512, svg: bg + mark(gold, 0.7, '#FFFFFF') },
  { file: 'web/icons/apple-touch-icon.png', size: 180, svg: bg + mark(gold, 0.9, '#FFFFFF') },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const v of variants) {
  const html = `<html><head><style>@font-face{font-family:Amiri;src:url(data:font/ttf;base64,${font})}html,body{margin:0;background:transparent}</style></head>
  <body><svg xmlns="http://www.w3.org/2000/svg" width="${v.size}" height="${v.size}" viewBox="0 0 1024 1024">${v.svg}</svg></body></html>`;
  await page.setViewportSize({ width: v.size, height: v.size });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(root, v.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.locator('svg').screenshot({ path: out, omitBackground: !!v.transparent });
  console.log('wrote', v.file);
}
await browser.close();
