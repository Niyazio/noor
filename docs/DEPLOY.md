# Publishing Noor without the app stores

`npm run site:build` produces `dist/site/` (and `dist/noor-website.zip`):

| Path | What |
|---|---|
| `/` | Download page — detects Android / iPhone / PC and shows the right install steps |
| `/app/` | Installable web app (PWA): works offline after first open, data stored on the device |
| `/downloads/noor.apk` | Android APK (only when built with `APK_PATH=...`) |
| `/downloads/noor-source.zip` | Source code of the deployed commit |

## Option A — Cloudflare Pages, drag and drop (no Git needed, ~2 minutes)

1. Sign in at https://dash.cloudflare.com (free plan is enough).
2. **Workers & Pages → Create → Pages → Use direct upload**.
3. Project name: `noor` → **Create project**.
4. Unzip `noor-website.zip` and drag the **folder** onto the upload area → **Deploy site**.
5. Your URL: `https://noor.pages.dev` (or `noor-xxx.pages.dev` if the name is taken).
   Optional: **Custom domains** tab to attach your own domain.

To update later: **Create new deployment** in the same project and upload the new folder.

## Option B — Automatic: GitHub → APK + Cloudflare (recommended long-term)

`.github/workflows/release.yml` runs on every push to `main`:
1. builds the Android APK on GitHub’s servers (Android SDK is pre-installed there),
2. publishes `noor.apk` as the latest GitHub Release (Cloudflare Pages limits files to 25 MiB, so the APK
   is not stored inside the site),
3. builds the website, whose “Download APK” button points to
   `https://github.com/<you>/<repo>/releases/latest/download/noor.apk`,
4. deploys it to Cloudflare Pages project `noor`.
The repository must be **public** for visitors to download the APK from Releases.

Setup once:
1. Create a GitHub repository and push this project to `main`.
2. Cloudflare dashboard → **My Profile → API Tokens → Create Token → “Edit Cloudflare Workers”** template
   (or a custom token with *Account → Cloudflare Pages → Edit*). Copy the token.
3. Copy your **Account ID** (Workers & Pages overview, right sidebar).
4. GitHub repo → **Settings → Secrets and variables → Actions** → add `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`.
5. Push (or **Actions → Build APK & deploy website → Run workflow**).

Note: the workflow has not been executed yet (no GitHub access from the build environment). If the first run
fails, the logs in the Actions tab show the step.

## Option C — APK only, from your computer via Expo (EAS)

```bash
npm install
npx eas-cli@latest login            # free Expo account
npx eas-cli@latest build --platform android --profile preview
```
EAS prints a download link and QR code for the APK (~15–25 min). To show it on the download page, rebuild with
`APK_URL=<that link> npm run site:build` and upload the folder again (Option A). Only use
`APK_PATH=path/to/app.apk` if the file is under 25 MiB (Cloudflare Pages’ per-file limit).

## Platform notes

- **Android:** the APK is signed with a debug key; fine for sharing directly, but create a private keystore
  before any Play Store release. Users must allow “Install unknown apps”.
- **iPhone/iPad:** Apple does not allow installing app files outside the App Store (without a paid developer
  account). The web app installs via Safari → Share → *Add to Home Screen* and runs full-screen and offline.
  Web apps cannot schedule prayer-time notifications or read the compass reliably — the download page says so.
- **PC/Mac:** Chrome/Edge → *Install Noor* in the address bar.
- **Other hosts:** the folder also works on Netlify Drop, Vercel or GitHub Pages (`SITE_BASE=/<repo>` for a
  project page). Deep links use the `404.html` fallback, supported by all of them.
