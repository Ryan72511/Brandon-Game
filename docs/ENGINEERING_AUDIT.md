# Gasp — Production-Readiness Engineering Audit

Running log. Newest sections appended as work proceeds.

## Baseline (before any changes)

Captured on a clean tree at audit start. Commands and results:

| Check | Command | Result |
|---|---|---|
| Prisma schema | `npx prisma validate` | **Passed** — schema valid |
| Type check | `npx tsc --noEmit` | **Passed** — exit 0 |
| Lint | `npm run lint` (eslint) | **Passed** — no output |
| Unit tests | `npm test` (node --test) | **Passed** — 6/6 |
| Production build | `npm run build` | **Passed** — exit 0 |
| Fresh seed + startup | `npm run seed` → `npm start` | **Passed** — HTTP 200 |
| End-to-end | `node tests/e2e/flows.test.mjs` | **Passed** — 47/47 (fresh seed) |

Package manager: **npm** (package-lock.json). Runtime deps: next, react, react-dom, @prisma/client, prisma. No SaaS, no UI kit.

Hygiene sweep: no TODO/FIXME/HACK markers; 4 `console.*` calls; no `any`/`@ts-ignore`; no `dangerouslySetInnerHTML`; only raw SQL is the WAL `PRAGMA` in lib/db.ts; no skipped/focused tests.

## Method

Six read-only investigators ran in parallel over distinct scopes (auth/authz; visibility/moderation/age-gate; DB/concurrency/scoring; upload/media safety; performance/player lifecycle; frontend a11y/Capacitor/dead-code). Each returned evidence, severity, reproduction, and a proposed fix. Findings were then independently re-verified against the code before any change. Fixes were applied by the orchestrator (agents never edited files, so parallel runs were conflict-free).

## Executive summary

The core architecture is genuinely sound: `getFeedVideos()` is a real, universally-applied visibility choke point (no metadata/thumbnail leak found), every by-id mutation is ownership-checked, admin routes are role-gated, sessions are invalidated on password change/reset/suspend/delete, the Popcorn Score math is consistent everywhere, and rating counters are recomputed (not blindly incremented). The defects were concentrated at the **byte layer** (media served with no visibility check), in **write-side/indirect surfaces** (interacting with hidden content by id; counts leaking hidden inventory), one **live data-integrity bug** (counter drift on user deletion), **auth-hardening details**, and **a11y/App-Store-accuracy** gaps. All P1s and the high-confidence P2/P3s are fixed and covered; the rest are documented with a clear owner (before-Postgres / before-scale / before-multi-instance).

## Findings

Severity: P0 (none found) · P1 (fix now) · P2 (high-value) · P3 (cleanup/edge). Status: ✅ fixed & verified · 📄 documented (see Remaining risks).

| ID | Sev | Status | Area | Problem | Fix |
|---|---|---|---|---|---|
| MEDIA-1 | P1 | ✅ | Media/visibility | `/media/[...path]` served **all** bytes with no auth/visibility/age check — a removed, draft, pending, suspended-creator, or mature upload stayed streamable by URL, defeating moderation + age-gate. | Gate `/media/uploads/*`: look up the owning video, apply `isPublicVideo` + suspended + mature/`isAdult` (+ owner/admin exempt); orphans 404. Seed `/media/videos` stays public. Added `X-Content-Type-Options: nosniff`; gated uploads use `Cache-Control: private, no-cache` so a CDN can't keep serving removed content. |
| DEL-1 | P1 | ✅ | DB integrity | Deleting a user cascade-removed their ratings on **other** creators' videos but never recomputed those videos' cached counters/`popcornScore` → permanent over-count on the feed, search, and all-time chart. | Gather the affected video ids before deletion; `recomputeVideoCounters()` each afterward (new shared helper reusing the rate route's groupBy logic). |
| STORE-1 | P1 | ✅ | App Store | Privacy manifest + `APP_STORE.md` declared "no email collected", but signup now collects email → Apple metadata-reject risk. | Added `NSPrivacyCollectedDataTypeEmailAddress` (linked, not tracking, App Functionality) to `PrivacyInfo.xcprivacy`; corrected the two docs claims. |
| AUTH-1 | P2 | ✅ | Auth | Session cookie (1-year bearer) missing `Secure`. | `secure: NODE_ENV === "production"`. |
| SEC-1 | P2 | ✅ | Auth | `getCurrentUser()` returned the full user row incl. `passwordHash`/`recoveryCodeHash` — one careless `<Client user={user}/>` from leaking hashes. | Strip both hashes from the returned object. |
| RATE-1 | P2 | ✅ | Scoring | Re-rating reset `Rating.createdAt = now`, injecting old votes into the weekly-chart window. | Keep original `createdAt` on update. |
| BUSY-1 | P2 | ✅ | DB | No `busy_timeout` → concurrent writes could throw `SQLITE_BUSY` (500). | `PRAGMA busy_timeout=5000`. |
| PERF-1 | P2 | ✅ | Performance | `/watch/[id]?ch=`/`?series=` and `/studio` ran unbounded `findMany` → hundreds of mounted `<video>` nodes / whole-catalog serialization. | `take` caps (60 / 100 / 60). |
| UP-1 | P2 | ✅ | Upload | 200 MB check ran *after* `formData()` buffered the whole body. | Reject oversized `Content-Length` before parsing (413). |
| UP-2 | P2 | ✅ | Upload | File-write-then-DB-write orphaned files on a failed create. | Wrap the DB steps; `removeUpload()` compensating cleanup on throw. |
| A11Y-1 | P2 | ✅ | A11y | Bottom sheets had no focus trap, no focus restoration, no scroll lock. | Trap Tab, restore focus on close, lock body scroll (`Sheet.tsx`). |
| A11Y-2 | P2 | ✅ | A11y | Playing video couldn't be paused via keyboard (pause control only rendered when already paused; `<video>` not focusable). | Always-rendered pause button (invisible while playing, revealed on focus/hover). |
| A11Y-3 | P2 | ✅ | A11y | `maximumScale=1` disabled pinch-zoom (WCAG 1.4.4). | Removed `maximumScale`. |
| A11Y-4 | P2 | ✅ | A11y | `--color-ink-faint` (#5e5d6b) ~3:1 — failed AA for small text. | Lightened to #8a8996 (AA on bg + surface); same for `--color-night-meta`. |
| A11Y-5 | P2 | ✅ | A11y | Fixed TabBar + sheets had no `env(safe-area-inset-*)` → could sit under the iOS home indicator. | Safe-area bottom padding on TabBar + Sheet. |
| AUTH-2 | P3 | ✅ | Auth | Login/reset ran scrypt only when the account existed → timing enumeration oracle. | Dummy scrypt (`dummyVerify`/`dummyVerifyRecovery`) on the missing-account path. |
| INT-1 | P3 | ✅ | Visibility | rate/comment/view/progress accepted any existing video id → seed ratings/comments/views onto drafts/removed/mature by id. | Shared `canInteractWithVideo()` gate on all four (owner-exempt). |
| NEXT-1 | P3 | ✅ | Visibility | `nextEpisodeId` filtered on `status` only → "Next ▶" could point at a scheduled/mature/suspended episode (dead link + existence leak). | Filter next-episode lookup through `publicVideoWhere` + mature gate. |
| CNT-1 | P3 | ✅ | Visibility | Channel search `_count.videos` counted hidden videos and surfaced suspended creators' channels. | Filtered `_count` by `publicVideoWhere`; exclude suspended owners (prebuilt kept). |
| DEAD-1 | P3 | ✅ | Cleanup | Unused `.afterglow-text`/`.afterglow-fill` utility classes. | Removed. (Unused color/easing/radius **tokens** retained as documented design-system scaffolding.) |
| XFF-1 | P2 | 📄 | Auth | Per-IP limiter trusts left-most `X-Forwarded-For` (spoofable) — the only global flood/scrypt-DoS cap. | Proxy-config dependent; see Remaining risks (before public launch). |
| ENUM-1 | P2 | 📄 | Auth | Signup returns distinct "username taken" vs "email in use" → email-presence oracle. | UX vs privacy tradeoff; proper fix is email verification (not yet wired). |
| PG-1 | P1* | 📄 | Postgres | Concurrent ratings lost-update on Postgres READ COMMITTED (masked by SQLite's writer lock). | Before Postgres: row lock / `Serializable` / atomic SQL. |
| PG-2 | P1* | 📄 | Postgres | `contains` search is case-sensitive on Postgres (SQLite `LIKE` hides it). | Before Postgres: `mode:"insensitive"` / normalized columns. |
| SCALE-* | P2/P3 | 📄 | Scale | Weekly-chart full scan (cached), view double-count TOCTOU, all-time crowd-out, page-level unbounded reads, in-process caches (multi-instance). | Before scale / multi-instance. |
| MEDIA-2 | P2 | 📄 | Moderation | Soft-removed videos' files stay on disk (restore is intentional; access now gated by MEDIA-1). | Physical purge deferred (object-storage lifecycle). |

\* PG-1/PG-2 are P1-severity *for a Postgres deployment* but cannot occur on the current SQLite build.

## Changes implemented (files)

- **lib/session.ts** — `secure` cookie in prod; `getCurrentUser` strips hashes; `dummyVerify` helper.
- **lib/recovery.ts** — `dummyVerifyRecovery` helper.
- **app/api/auth/login/route.ts**, **reset/route.ts** — dummy-verify on missing account (timing).
- **app/media/[...path]/route.ts** — visibility gate on uploads + `nosniff` + revalidate cache. (Regression-tested.)
- **lib/data.ts** — `canInteractWithVideo()` + `recomputeVideoCounters()` helpers; next-episode visibility filter.
- **app/api/videos/[id]/rate|comments|view|progress/route.ts** — interaction gate. rate route also stops resetting `createdAt`.
- **app/api/account/route.ts** — recompute affected videos' counters on account deletion.
- **app/api/videos/route.ts** + **lib/storage.ts** — Content-Length precheck, orphan cleanup, `removeUpload()`.
- **lib/db.ts** — `busy_timeout`.
- **app/watch/[id]/page.tsx**, **app/studio/page.tsx** — pagination caps.
- **lib/search.ts** — suspended-owner exclusion + filtered channel count.
- **components/watch/Sheet.tsx** — focus trap, focus restore, scroll lock, safe-area.
- **components/watch/VideoSlide.tsx** — always-present accessible pause control.
- **components/TabBar.tsx** — safe-area inset.
- **app/globals.css** — faint-text contrast; removed dead utilities. **app/layout.tsx** — pinch-zoom.
- **ios-wrapper/PrivacyInfo.xcprivacy**, **docs/APP_STORE.md** — email disclosure.
- **tests/e2e/flows.test.mjs** — new "upload media + interactions are gated by visibility" flow (F-A + nosniff + INT-1); the existing "delete account" flow now also exercises DEL-1.

## Test report

| Check | Result |
|---|---|
| `npx prisma validate` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm test` (unit) | Passed — 6/6 |
| `npm run build` | Passed |
| e2e (fresh seed) | Passed — **48/48** (was 47; +1 regression test) |

## Remaining risks

**Before public web launch**
- XFF-1: derive client IP from the trusted proxy hop, not left-most `X-Forwarded-For` (or cap concurrent scrypt). Currently the only global auth-flood/CPU-DoS bound.
- ENUM-1: signup email-existence oracle — resolve when email verification lands (respond "check your inbox" regardless).
- Session lifetime is 1 year with no idle expiry (product decision).

**Before App Store submission**
- Set `GASP_APP_URL` at build (`cap sync`) and add the prod host to `server.allowNavigation` (avoids the `.example` white-screen and in-app→Safari bounces).
- Device-verify WKWebView cookie persistence across cold launch (cookie is `Max-Age` 1y, so expected to persist) and safe-area layout on a notch device + SE.
- Regenerate the Xcode privacy report and match the App Store Connect questionnaire to the updated manifest (now includes Email).

**Before meaningful volume**
- Weekly-chart aggregation (DB groupBy / precomputed table), view double-count TOCTOU (unique day key), all-time crowd-out (filter min-count in query), page-level `take`/pagination on creator/channels/friends/admin lists, server-side duration probe (ffprobe).

**Before PostgreSQL**
- PG-1 concurrent-rating isolation (row lock / Serializable / atomic SQL); PG-2 case-insensitive search; audit the `view`/day-boundary server-local-midnight assumption.

**Before multi-instance**
- Replace in-process `candidateCache`/chart cache with a shared store (or precomputed tables); SQLite → Postgres is a prerequisite anyway.

**Longer term**
- Object-storage lifecycle to physically purge removed media (MEDIA-2); signed URLs replacing the gate at CDN scale.
