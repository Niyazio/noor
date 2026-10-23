# Azan sound

No Azan recording is bundled with this repository: none with a clear licence was available, and the app
must not ship unlicensed audio. You choose the recording.

## Android / iOS app (works when the app is closed or the phone is locked)

1. Get a recording you have the right to use (your mosque's, a commissioned one, or a recording whose licence
   allows redistribution in an app).
2. Save it in `assets/sounds/`:
   - `adhan.mp3` — Android. Played **in full** by the notification channel when a prayer time arrives.
   - `adhan.wav` or `adhan.caf` — iPhone. iOS plays notification sounds for **at most 30 seconds**
     (Apple limitation), so use a short clip.
3. Build the app (GitHub workflow or `eas build`). `app.config.ts` detects the files automatically and the
   alert settings screen says “An Azan recording is built into this app”.

Each prayer's alert can be **Azan**, **Tone** (default notification sound), **Vibrate**, **Silent** or **Off**
(More → Prayer alerts). Android channel ids include the sound file name, so a later build that adds a recording
creates a fresh channel with the new sound.

## Web app (iPhone/PC home-screen app)

Browsers do not allow a website to play sound or show notifications while it is closed. While the web app is
open (tab or installed window) it plays the Azan at prayer time and shows a browser notification:
More → Prayer alerts → **Choose audio file** stores your recording on that device only. Without one, a short
synthesised chime plays. If the browser blocks automatic sound, a banner with a **Play** button appears.
