# Reely — iPhone App Store submission playbook

Status against the readiness checklist, what ships in this codebase, and
what must happen in the native wrapper / App Store Connect before submitting.

## What's already built into the app ✅

**Concept & content**
- Native-feeling mobile UI (bottom tabs, sheets, scroll-snap feed), all video
  streamed in-app from our own storage — no external links or embeds.
- 38 seeded videos across 14 prebuilt channels; no empty feeds or
  placeholders. (Swap in licensed/commissioned launch content before real
  submission — the seed clips are generated stand-ins.)

**UGC safety (Guideline 1.2)**
- Report on every video (detail sheet), every creator (profile), and every
  comment — six reason categories including copyright.
- Block a creator: their videos and comments disappear for that viewer
  everywhere (feeds, search, channels, comments).
- Moderation dashboard at `/admin` (admin accounts only): pending-review
  queue, open reports with one-tap remove/suspend/dismiss, resolved-report
  log (the documented record of decisions), suspended-account management.
- Suspension: blocks sign-in, kills sessions, hides all content instantly.
- Pre-publication review mode: set `REELY_REVIEW_MODE=1` and every new
  upload lands in the moderation queue as "In review" until approved.
  **Turn this ON for the App Store build** (checklist's curated-launch
  approach). Local dev leaves it off so demos stay one-step.
- Community guidelines, Terms of use, Privacy policy, Copyright/takedowns,
  and Support pages live at `/about/*`, linked from the You tab and at
  signup ("By continuing you agree…"). Support contact: support@reely.app
  (rights holders don't need an account).

**Rights & age**
- Upload requires an explicit rights confirmation ("This is mine to
  share…", stored with timestamp on the video row).
- Creators flag mature themes at upload; moderators can correct it (edit
  form). Mature content is labeled on the player and excluded from
  Surprise Me and signed-out feeds. Terms set a 13+ floor.

**Accounts**
- Browsing/watching works signed-out; accounts gate rating/saving/creating.
- In-app permanent **Delete account** (typed confirmation) removes the user,
  all content, and uploaded media files; sessions expire server-side.

**Technical quality**
- Poster frames on all videos, custom controls (pause/seek/mute/CC),
  muted autoplay, one-video-at-a-time playback, load-failure overlay with
  retry, friendly 404, MP4+WebM renditions, HTTP-Range streaming,
  rate limits on auth/writes/uploads, no client-side secrets,
  captions with CC toggle, VoiceOver labels and 44px+ targets throughout.

## What the native wrapper must add 📦

The product ships as a responsive web app; the App Store build wraps it
with **Capacitor** (WKWebView). Wrapper-level work:

1. **Xcode project** built with the current required iOS SDK (verify the
   minimum — iOS 26 SDK as of July 2026 — right before upload).
2. **Sign in with Apple**: required only if a third-party social login is
   added. Today Reely uses its own username/password accounts, which is
   allowed without Sign in with Apple. If you ever add Google/Facebook
   login, add Apple's at the same time.
3. **PrivacyInfo.xcprivacy** (privacy manifest) declaring:
   - Collected data: user content (videos, comments), identifiers (none
     beyond username), usage data (watch history — linked, not tracking).
   - No tracking, no ad SDKs, no third-party analytics (true today —
     revisit if any SDK is added).
   - Required-reason APIs: only what Capacitor itself uses (UserDefaults —
     reason CA92.1). Audit with Xcode's report before upload.
4. **No ATT prompt** — the app does not track. Answer the App Store privacy
   questionnaire accordingly (Data Not Collected is wrong; declare the
   collected-but-not-tracking categories above).
5. **Permissions**: only Photos picker (video upload) — use the system
   picker (`UIImagePickerController`/PHPicker via the file input), which
   needs no photo-library permission prompt. No camera/mic/location.
6. Orientation: portrait-primary with landscape allowed on the player;
   safe-area insets already respected by the web UI (test on notch + SE).

## Production infrastructure before submission 🚧

- Deploy per docs/ARCHITECTURE.md: Postgres, S3/R2 + CDN for media,
  HTTPS domain (share sheet requires it), Mux (or keep single-rendition
  MP4/WebM to start — allowed, just heavier).
- Set `REELY_REVIEW_MODE=1`.
- Replace generated seed videos with real licensed launch content; keep
  the license/consent records (Apple may ask).
- Email service for support@reely.app (and for password reset — see gaps).
- Crash/uptime monitoring (e.g. Sentry — then update the privacy manifest
  and policy accordingly).

## Known gaps to close before real users ⚠️

1. **Password reset**: accounts are username-only (kid/grandparent-simple,
   no email collected — a privacy plus). But there is no self-serve reset;
   today it's support-assisted. Options: add optional recovery email, or
   Sign in with Apple as primary. Decide before scale.
2. **Age assurance**: 13+ is declared in Terms; there is no birthdate
   gate. If the App Store age rating lands at 12+, add a declared-age step
   at signup and hide mature-flagged content from under-17 accounts.
3. **Content scanning**: moderation is human (reports + review queue).
   At scale add automated CSAM/NSFW scanning at upload (e.g. hive.ai,
   AWS Rekognition) — non-negotiable before open registration.

## App Store Connect package 📝

- **Name**: Reely (5 chars ✓). **Subtitle** (≤30): "Tiny shows. Big feelings."
- **Description**: watch and make one-minute 16:9 mini-shows; build your own
  TV-style channels; rate with the Popcorn Score; family-friendly by design.
  Never mention TikTok/Netflix/Instagram or other trademarks.
- **Age rating questionnaire**: infrequent/mild mature themes possible via
  UGC (that's why the mature flag + moderation exist) — answer honestly;
  expect 12+.
- **Screenshots**: real UI only — watch feed, channel storefront, a channel
  page, creator page, studio analytics. (The Playwright screenshot scripts
  in this repo generate exact-size captures.)
- **Privacy policy URL**: https://<domain>/about/privacy ·
  **Support URL**: https://<domain>/about/support

## Notes for App Review (paste + adapt) 🗒

> Reely is a curated platform for cinematic 16:9 mini-videos ("tiny shows").
> 1. All uploads require a rights confirmation and are held for moderator
>    approval before publication (review mode is enabled in this build).
> 2. Every video, creator, and comment has a Report option (six categories);
>    viewers can block any creator from the creator's profile page.
> 3. Moderation happens at /admin (see moderator login below): approve/reject
>    queue, report handling, suspensions; all decisions are logged.
> 4. Mature-flagged content is labeled and kept out of kid-facing surfaces.
> 5. Account deletion: You tab → Delete account (typed confirmation;
>    removes the account, personal data, and uploaded videos).
> 6. Browsing and watching work without an account.
> 7. No purchases, subscriptions, ads, or tracking in this version.
>
> Reviewer accounts (non-expiring, no codes required):
> - Viewer/creator: `appreview` / `reely123` — full watch + create experience.
> - Moderator: `moderator` / `reely123` — opens the /admin dashboard from
>   the You tab ("Moderation").

## Reviewer walkthrough (mirrors the checklist's final test)

Fresh install → browse signed-out → sign up → watch 10 videos → rate/save/
comment (timecoded) → captions on "The Last Yogurt" → search → follow +
share a channel → report a video → block a creator (their videos vanish) →
switch to Creating → upload (rights box, mature flag, goes to "In review"
when review mode is on) → moderator approves at /admin → edit/delete the
video → delete the account → confirm the login is gone. Every step above is
covered by the automated e2e suite in tests/e2e/flows.test.mjs.
