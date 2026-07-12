# Gasp iOS wrapper (Capacitor) — build & submit

This is the definitive, step-by-step guide to turn the Gasp web app into an
iPhone app and submit it to the App Store. It complements
[`docs/APP_STORE.md`](../docs/APP_STORE.md) (the product/policy submission
playbook) — this file covers the **native wrapper mechanics**.

Everything here happens on a **Mac** (Xcode is macOS-only). The repo already
ships the config you need:

- [`../capacitor.config.ts`](../capacitor.config.ts) — Capacitor config
- [`PrivacyInfo.xcprivacy`](./PrivacyInfo.xcprivacy) — privacy manifest to drag in
- [`exportOptions.plist`](./exportOptions.plist) — optional CLI export template

## How the app works (read this first)

Gasp is a **server-rendered Next.js 15 app** (API routes, Prisma, dynamic
pages). It is **not** statically exportable, so the iOS app does **not** bundle
HTML/JS. Instead the native app is a thin **WKWebView container** that loads
your **live, hosted HTTPS site** via `server.url` in `capacitor.config.ts`.
This is a real native app calling your production API — the standard,
App-Store-acceptable Capacitor pattern for server-driven Next.js. It means:

- You must **deploy Gasp to an HTTPS domain first** (Vercel, etc. — see
  `docs/ARCHITECTURE.md`).
- You set that domain via the **`GASP_APP_URL`** env var (below). Get this
  wrong and you get a white screen.

---

## 1. Prerequisites

1. **macOS** with the current **Xcode** from the Mac App Store. Gasp targets
   the current required iOS SDK — **iOS 26 SDK as of July 2026** per
   `docs/APP_STORE.md`. Apple periodically raises the minimum; **verify the
   currently required SDK/Xcode version right before you upload**.
2. **Apple Developer Program** membership (paid) — needed for signing and App
   Store Connect. Have your **Team ID** (Apple Developer portal → Membership).
3. **CocoaPods** (Capacitor iOS uses it to install native pods):
   ```bash
   sudo gem install cocoapods
   # or, if you use Homebrew:  brew install cocoapods
   ```
4. **Node 18+** and this repo cloned, with `npm install` already run once so
   the web app's own deps are present.
5. A **deployed HTTPS build of Gasp** you can point the app at (see step 3).

---

## 2. Install Capacitor and add the iOS platform

From the repo root:

```bash
# Core + CLI + iOS platform + the plugins the wrapper uses.
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/status-bar @capacitor/splash-screen @capacitor/share @capacitor/app

# Scaffold the native iOS project (reads capacitor.config.ts, incl. appId).
npx cap add ios
```

> `npx cap add ios` reads `appId` ("app.gasp.ios") from
> `capacitor.config.ts`. If you want your own bundle identifier, change `appId`
> in that file **before** running `cap add` (see the big comment at the top of
> `capacitor.config.ts`).

This creates an `ios/` folder (the native Xcode project) at the repo root.

---

## 3. Point the app at your live site, then sync

The app loads whatever `server.url` resolves to. Set **`GASP_APP_URL`** to
your deployed HTTPS domain and sync so the value is baked into the native
project:

```bash
# Use YOUR real deployed domain — HTTPS, no trailing slash.
GASP_APP_URL="https://app.gasp.com" npx cap sync ios
```

`cap sync` copies config, installs the CocoaPods, and wires up the plugins.
Re-run it any time you change `capacitor.config.ts`, add a plugin, or change
`GASP_APP_URL`.

> Also add your production host to `server.allowNavigation` in
> `capacitor.config.ts` if you need in-app navigation to a second origin (auth
> callback, separate CDN host, etc.), then `cap sync` again.

---

## 4. Native configuration to set in Xcode

Open the project (step 8) and set, on the **App** target:

- **Signing & Capabilities**
  - **Team**: your Apple Developer team (enables automatic signing).
  - **Bundle Identifier**: must equal `appId` from `capacitor.config.ts`
    (`app.gasp.ios`, or your custom value). Register the same App ID in the
    Apple Developer portal / App Store Connect.
- **General → Identity**
  - **Display Name**: `Gasp`
  - **Version** (e.g. `1.0.0`) and **Build** (e.g. `1`) — bump Build for every
    upload.
- **General → Deployment Info**
  - **Minimum Deployments (iOS target)**: match what the current SDK supports
    (Capacitor's default is fine; a modern value like iOS 15+ is typical).
  - **Orientation**: check **Portrait**. Landscape is only wanted for
    full-screen video playback — the web player requests landscape via the
    Fullscreen API, so you can leave Landscape Left/Right checked to allow it
    while the UI itself stays portrait-primary.
- **App Icon**: add your icon set to `Assets.xcassets → AppIcon` (a single
  1024×1024 PNG with Xcode's "single size" app icon works). Point the target's
  icon at it.
- **Splash / launch**: Capacitor generates a launch storyboard. The splash
  background (`#12142a`) and 800ms duration come from the `SplashScreen` plugin
  config in `capacitor.config.ts`; replace the generated splash image under
  `ios/App/App/Assets.xcassets` with branded art if desired.

---

## 5. Info.plist notes

Capacitor generates `ios/App/App/Info.plist`. Set/verify:

- **App Transport Security**: keep the default **HTTPS-only** posture. Do
  **not** add `NSAllowsArbitraryLoads` — `server.url` is HTTPS and
  `cleartext:false`, so no ATS exceptions are needed. (If you must reach a
  specific non-TLS host, add a narrowly-scoped `NSExceptionDomains` entry — but
  avoid it.)
- **`NSPhotoLibraryUsageDescription`** — **only if** you wire up the native
  photo picker (`@capacitor/camera` or similar). Suggested string:
  > `Gasp needs access to your photos so you can upload videos.`

  You do **not** need this if you rely on the web `<input type="file">`, which
  uses the system document/photo picker and requires **no** permission prompt.
  That's the default and recommended path.
- **No** camera, microphone, or location usage strings — Gasp uses none of
  those. Adding unused permission strings can trigger App Review questions.

---

## 6. Privacy manifest (`PrivacyInfo.xcprivacy`)

Drag [`ios-wrapper/PrivacyInfo.xcprivacy`](./PrivacyInfo.xcprivacy) into the
Xcode project (into the **App** target; "Copy items if needed" checked so it
lands in **Copy Bundle Resources**). It declares — matching `docs/APP_STORE.md`:

- **No tracking** (`NSPrivacyTracking = false`, empty tracking domains) → no
  ATT prompt.
- **Collected data, linked but not tracking, for App Functionality**:
  - **User content** (uploaded videos, comments).
  - **Product interaction** (watch history / usage) — first-party only; Gasp
    has no third-party analytics today.
- **Required-reason APIs**: **UserDefaults (CA92.1)** used by the Capacitor
  container; an optional **File timestamp (C617.1)** entry (keep only if
  Xcode's required-reason audit flags it).

The file's header comments say exactly what to adjust if you later add Sentry
(crash data) or any analytics/ad SDK. Keep this manifest and your **App Store
Connect privacy answers** in sync (App Privacy → declare the collected-but-not-
tracking categories above; **"Data Not Collected" is wrong**).

For the ready-to-paste XML, open the file directly — it is complete and
drop-in.

---

## 7. Native share (optional)

Gasp's web UI already uses **`navigator.share`** for sharing channels/links.
Inside WKWebView, `navigator.share` presents the **native iOS share sheet**
automatically — for most cases you need to do nothing. Requirements:

- The site must be served over **HTTPS** (it is, via `server.url`).
- `navigator.share` only fires from a **user gesture** (a tap) — Gasp's share
  buttons already are.

If you want a native share sheet from **native code** (or a guaranteed
fallback), the `@capacitor/share` plugin is already installed; call it from a
small bridge:

```ts
import { Share } from "@capacitor/share";
await Share.share({
  title: "Gasp",
  text: "Check out this channel on Gasp",
  url: "https://app.gasp.com/channel/whodunit-lane",
});
```

You don't need this to ship — the web `navigator.share` path is sufficient.

---

## 8. Build & submit

```bash
npx cap open ios    # opens ios/App/App.xcworkspace in Xcode
```

Then in Xcode:

1. Select the **App** scheme and an **Any iOS Device (arm64)** destination (not
   a simulator — the App Store needs a device build).
2. Set **signing** (step 4) if you haven't.
3. **Product → Archive**. When it finishes, the **Organizer** opens.
4. **Distribute App → App Store Connect → Upload**. Let Xcode manage signing;
   include symbols.
5. In **App Store Connect**: the build appears under **TestFlight** after
   processing. Add it to internal TestFlight, install, smoke-test.
6. Fill the **App Store** listing (name, subtitle, description, screenshots,
   privacy answers, age rating — all specified in `docs/APP_STORE.md`), attach
   the build, and **Submit for Review**. Paste the reviewer notes + reviewer
   accounts from `docs/APP_STORE.md`.

> CLI alternative (CI): use [`exportOptions.plist`](./exportOptions.plist) with
> `xcodebuild archive` / `-exportArchive` — see that file's header. Set your
> `teamID` in it first.

Before uploading, make sure the deployed site has the App-Store production
settings from `docs/APP_STORE.md` (notably **`GASP_REVIEW_MODE=1`** and real
licensed launch content).

---

## 9. On-device testing checklist

Install the TestFlight build on a **real iPhone** (ideally one with a notch and
an SE-class device) and walk the reviewer flow from `docs/APP_STORE.md`:

- [ ] App launches to the live site (no white screen); splash shows briefly.
- [ ] Browse **signed-out** → sign up → watch 10 videos.
- [ ] Rate / save / comment (timecoded); tap a time chip → video seeks.
- [ ] Turn **captions (CC)** on for a video.
- [ ] Search; follow + **share** a channel → native share sheet appears.
- [ ] **Report** a video; **block** a creator → their videos disappear.
- [ ] Switch to **Creating** → upload via the file picker (rights box + mature
      flag; lands "In review" when review mode is on).
- [ ] Moderator approves at `/admin`; edit/delete the video.
- [ ] **Delete account** (typed confirmation) → login is gone.
- [ ] **Safe areas**: content clears the notch and home indicator; bottom tab
      bar isn't under the indicator.
- [ ] **Orientation**: UI stays portrait; video goes landscape in fullscreen.
- [ ] **Back-swipe / navigation** feels right; no dead ends.

---

## 10. Troubleshooting

- **White screen on launch** → `server.url` is wrong or not reachable over
  **HTTPS**. Confirm `GASP_APP_URL` was set when you ran `cap sync ios`, the
  domain is live, and the cert is valid. Re-run
  `GASP_APP_URL="https://…" npx cap sync ios`. Never enable `cleartext`.
- **Content under the notch / home indicator** → ensure
  `ios.contentInset: "always"` (it is in `capacitor.config.ts`) and that the
  web UI uses `env(safe-area-inset-*)`. Re-`cap sync` after config changes.
- **Back-gesture does nothing / feels off** → WKWebView's edge-swipe maps to
  browser back; make sure in-app navigation stays within your origin
  (`server.allowNavigation`) so history is preserved. External links should
  open in Safari, not trap the user.
- **`navigator.share` doesn't open a sheet** → it must be called from a tap and
  over HTTPS; otherwise fall back to `@capacitor/share` (step 7).
- **Pods fail to install** → `sudo gem install cocoapods`, then
  `cd ios/App && pod install`, then re-open the **`.xcworkspace`** (not the
  `.xcodeproj`).
- **Signing errors on Archive** → set the **Team** and a matching **Bundle
  Identifier** (= `appId`); let Xcode create the managed profile.
