# Gasp — Finalization Handoff

For the agent taking Gasp to launch. Full audit detail: `docs/ENGINEERING_AUDIT.md`.
Current state: all P0/P1 and high-confidence P2/P3 findings are fixed. What
remains is gated below by *when* it must be done. Do the gates in order; nothing
here is required to keep the current build working.

## How to run & verify (do this first, and after every change)

```bash
npm install
npx prisma validate
npx tsc --noEmit          # must be exit 0
npm run lint              # must be clean
npm test                  # unit: 6/6
npm run build             # must succeed
npm run seed              # fresh demo DB
PORT=3100 npm start &     # then:
node tests/e2e/flows.test.mjs http://localhost:3100   # must be 48/48 on a FRESH seed
```
The e2e suite is **not idempotent** (it deletes accounts/removes videos) — always
`npm run seed` before a run or you'll get false failures. Demo login:
`demo` / `gasp123`. Admin: `moderator` / `gasp123`. Reviewer: `appreview` / `gasp123`.

## Guardrails (do not violate)
- No new runtime deps, no UI kit, no auth SaaS. Small native code over a library.
- Don't migrate to Postgres or add Redis as part of "finalizing" — those are their
  own gated projects below.
- Preserve the Gasp dark design + token system, the Watching⇄Creating model, the
  Popcorn Score, the centralized `getFeedVideos` visibility boundary, and
  deterministic recommendations.
- Strict TypeScript; no `any` to silence errors; don't disable lint or skip tests
  to go green. Add a regression test for every behavioral fix.

---

## GATE 1 — Before public web launch (do these to ship the website)

1. **Trust-proxy IP extraction (XFF-1).** `lib/ratelimit.ts` `clientIp()` trusts the
   left-most `X-Forwarded-For`, which the client controls — this defeats the per-IP
   auth-flood / scrypt-CPU cap. Fix: derive the client IP from the *trusted* hop for
   your host (e.g. right-most XFF after N known proxies, or the platform's
   connecting-IP header), configured via env. Acceptance: two requests with
   different spoofed `X-Forwarded-For` but the same real connection share one bucket;
   the 41st auth attempt/min still 429s regardless of the header.

2. **Signup email-enumeration (ENUM-1).** `app/api/auth/signup/route.ts` returns
   distinct "username taken" vs "email in use" messages — an email-presence oracle.
   Preferred fix ties into email verification (see below): always respond "check
   your inbox," never confirming existence. If verification isn't ready, at least
   make the collision message generic. Acceptance: username-vs-email collisions are
   indistinguishable to the caller.

3. **Wire email for real (unblocks #2 and password-reset-by-email).** The schema
   already has `User.email` + `User.emailVerifiedAt` (currently write-only). Add a
   provider (Resend/SES/SMTP) behind a small `lib/email` sender, a verify-token flow,
   and an emailed reset-link path alongside the existing recovery-code reset. Keep
   the recovery code working. This is the single highest-leverage remaining feature.

4. **Set production env**: `DATABASE_URL`, `NODE_ENV=production` (turns on the
   `Secure` cookie), and `REELY_REVIEW_MODE`/review flag if you want upload
   moderation on. Confirm the `Secure` + `HttpOnly` + `SameSite=Lax` cookie in a
   prod build.

## GATE 2 — Before App Store submission (needs a Mac + device; can't be done here)

5. **Build config**: set `GASP_APP_URL` to the real HTTPS host at `npx cap sync`
   time and add that host to `server.allowNavigation` in `capacitor.config.ts`
   (currently `[]`) so in-app auth/CDN navigation doesn't bounce to Safari. The
   default `https://app.gasp.example` is a deliberate fail-safe placeholder — it
   must be overridden.
6. **Device verification (TestFlight)**: cold-launch stays signed in (WKWebView
   cookie persistence — cookie is `Max-Age` 1y so it should); safe-area layout on a
   notch device + an SE (TabBar/sheets not under the home indicator); muted-inline
   autoplay; file-picker upload.
7. **Privacy sync**: the manifest now declares Email — regenerate Xcode's privacy
   report and make the App Store Connect privacy questionnaire match. Add Apple
   Sign-In only if you add any third-party social login (you haven't).
8. Follow `docs/APP_STORE.md` end-to-end; it's the submission playbook.

## GATE 3 — Before meaningful user volume
- Weekly chart: replace the full-week `rating.findMany` scan (`lib/charts.ts`) with a
  DB `groupBy` or a precomputed `ChartEntry` table.
- View double-count TOCTOU (`app/api/videos/[id]/view/route.ts`): add a unique
  `(userId, videoId, day)` key + upsert instead of find-then-create.
- All-time chart crowd-out (`lib/charts.ts`): filter `ratings >= 5` in the query,
  not after over-fetching.
- Add `take`/pagination to remaining page-level lists: creator page, `/channels`,
  `/friends`, `/admin`. Server-side duration probe (ffprobe) to truly enforce the
  5-min cap instead of trusting the client value.

## GATE 4 — Before PostgreSQL (schema already targets it)
- **Concurrent-rating isolation (PG-1)**: the rate-route recompute is safe only
  because SQLite serializes writers. On Postgres READ COMMITTED it can lose updates.
  Wrap the counter recompute in a row lock (`SELECT … FOR UPDATE`), `Serializable`
  isolation, or an atomic `UPDATE … SET count = (SELECT …)`. Test with concurrent
  rate calls asserting counters == a fresh `groupBy`.
- **Case-insensitive search (PG-2)**: add `mode: "insensitive"` to the `contains`
  filters in `lib/search.ts` (SQLite `LIKE` is case-insensitive today and hides
  this; Postgres is case-sensitive). Note SQLite rejects `mode`, so gate it by
  provider or move to normalized lowercase columns.
- Re-check the `view` day-boundary (`setHours(0,0,0,0)` uses server-local midnight).

## GATE 5 — Before multi-instance
- Replace the in-process `candidateCache` (`lib/recs.ts`) and chart cache
  (`lib/charts.ts`) — `invalidateCandidateCache()` only clears the local instance —
  with a shared store or the precomputed tables. (Postgres is a prerequisite anyway,
  since SQLite is single-node.)

## Longer term
- Move media to object storage + CDN with **signed URLs**; then physically purge
  removed media on a lifecycle policy (today removal is soft + access-gated, files
  linger on disk — MEDIA-2). Only `lib/storage.ts` + `app/media/[...path]/route.ts`
  should need to change; every stored URL keeps working.
- Product roadmap that's intentionally NOT built yet: monetization (coins/paywalls),
  live streaming, real recommendation ranking beyond content-based.

## Also note
- "Gasp" has only passed a public-web knockout check — **not trademark-cleared**.
  Do a proper class 9/38/41/42 search before committing to the name.
