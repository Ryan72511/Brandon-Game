# Gasp — Deployment brief

Everything an agent (or you) needs to put Gasp on a public website. Target
platform is **Railway** (config already in the repo). Also see
`docs/HANDOFF.md` (launch gates) and `docs/ENGINEERING_AUDIT.md` (limits).

Gasp is a **server-rendered Next.js 15 app** (App Router, API routes, Prisma).
It cannot be a static export. It runs as **one long-lived Node process** with
**SQLite on a persistent volume** and **uploaded media on that same volume**.

---

## 1. What's already wired up (in the repo)

- **`railway.json`** — builder `RAILPACK`; build = `npx prisma generate && npm run build`;
  start = `bash scripts/railway-start.sh`; healthcheck `GET /` (120s timeout);
  restart on failure.
- **`scripts/railway-start.sh`** (idempotent boot):
  1. Ensures a volume dir (`$MEDIA_VOLUME`, default `/data`) with `media/{videos,thumbs,uploads}`.
  2. First deploy: copies the baked-in demo media onto the volume, then replaces
     `./media` with a symlink to the volume (so uploads persist across redeploys).
  3. `prisma db push --skip-generate` (additive schema sync — safe on restart).
  4. Seeds demo content **once** (guarded by `$VOL/.seeded`, gated by `SEED_ON_FIRST_BOOT`).
  5. `npm start`.
- **Email** (`lib/email.ts`) — sends via Resend's HTTP API (no SDK). **Without
  `RESEND_API_KEY` it no-ops and prints the link to the server log**, so the app
  works with zero email config; you just won't get real emails.
- **Rate-limit client IP** is configurable for a real proxy (`lib/ratelimit.ts`).

## 2. What you must provide (accounts/secrets — an agent can't self-serve these)

1. A **Railway account** + a **service** deploying repo `Ryan72511/Brandon-Game`
   (branch `claude/video-streaming-platform-f2j8j7`, or merge to `main` first).
2. A **Railway Volume mounted at `/data`** — REQUIRED. Without it, the database
   and all uploaded media are wiped on every redeploy.
3. For real emails: a **Resend account → API key** and a **verified sending
   domain**. (Optional — email no-ops without it.)
4. Optional: a **custom domain**.

## 3. Environment variables (set these in Railway)

| Variable | Value | Required? |
|---|---|---|
| `DATABASE_URL` | `file:/data/gasp.db` — on the volume, NOT the dev default | **Yes** |
| `NODE_ENV` | `production` — enables the `Secure` session cookie | **Yes** |
| `APP_URL` | the public HTTPS origin, e.g. `https://gasp.up.railway.app` (used in email links) | **Yes** |
| `RESEND_API_KEY` | your Resend key | Yes for real emails |
| `EMAIL_FROM` | `Gasp <no-reply@yourdomain>` — must be on the Resend-verified domain | With email |
| `TRUSTED_PROXY_HOPS` | `1` (or set `TRUSTED_CLIENT_IP_HEADER` to Railway's real-IP header) — makes the rate limiter read the true client IP instead of a spoofable one | Recommended |
| `SEED_ON_FIRST_BOOT` | `1` seeds demo content once; **`0` for a clean public launch** | Decision (see §5) |
| `REELY_REVIEW_MODE` | `1` routes new uploads through moderation (pending → admin approve) | Recommended for public UGC |
| `MEDIA_VOLUME` | only if the volume is not mounted at `/data` | Optional |

Notes:
- `GASP_APP_URL` is for the **iOS Capacitor build only** — not the web deploy.
- Verify the `TRUSTED_*` choice against Railway's actual proxy: check what
  `x-forwarded-for` looks like on an inbound request and set hops/header so the
  limiter buckets by the real client IP. Getting this wrong only weakens the
  per-IP flood cap; the per-account brute-force limit is unaffected.

## 4. Deploy steps

1. Create the Railway service from the branch. **Add a Volume at `/data`.**
2. Set the env vars in §3.
3. Deploy. Railpack runs the build; the start script does volume + schema +
   first-boot seed, then `npm start`.
4. Wait for the **`GET /` healthcheck** to pass (may take up to ~120s on cold build).
5. Smoke-test live (see §6).

## 5. Two decisions to make before launch

- **Demo content on the public site?** The seed creates demo users/videos whose
  password is `gasp123` (incl. `moderator`/admin and `appreview`). You almost
  certainly do **not** want those on a real public site → set
  `SEED_ON_FIRST_BOOT=0`, deploy, then create your own account and promote it to
  admin (set that user's `role` to `admin` — e.g. a one-off `prisma studio` /
  SQL update on the volume DB). Keep `=1` only for a throwaway showcase.
- **Moderation on?** `REELY_REVIEW_MODE=1` so uploads land as `pending` and an
  admin approves them before they're public. Recommended for any real UGC.

## 6. Post-deploy smoke test (do this every deploy)

1. `GET /` returns the feed (200).
2. Sign up a new account → a verification email is sent (check Resend's
   dashboard, or the server logs if no key). Follow the link → `/verify`.
3. Forgot-password → reset link arrives → set a new password.
4. Switch to Creating → upload a short 16:9 video → it plays back from `/media`.
5. Rate it, comment, save it to a channel, follow a creator/series.
6. As the admin account, open `/admin` and confirm the moderation queue works.

## 7. Hard limitations — do not fight these

- **Single instance only.** SQLite + local-volume media + in-process caches mean
  **keep replicas = 1**. Scaling horizontally serves divergent/stale data. This
  is fine for launch and early traffic.
- **Scale path** (when you outgrow one box) is in `docs/ENGINEERING_AUDIT.md`:
  Postgres (schema already targets it — mind the two Postgres-only fixes noted
  there), object storage + CDN + signed URLs for media, and a shared cache
  (Redis) — in that order.
- **Redeploys don't reseed** (the `.seeded` marker) and **don't wipe uploads**
  (the volume). Schema changes must stay additive — they are today.
- **iOS App Store** is a separate track — `docs/HANDOFF.md` Gate 2. Once the web
  URL is live, point the Capacitor wrapper at it via `GASP_APP_URL` +
  `server.allowNavigation`. Needs a Mac.

## 8. If not Railway

The only Railway-specific pieces are `railway.json` and `scripts/railway-start.sh`.
On any Node host you need, equivalently: a **persistent disk** for SQLite +
`media/`, `DATABASE_URL=file:<path-on-disk>/gasp.db`, run
`prisma generate && next build` then `prisma db push && next start`, seed once,
and the §3 env vars. A platform that gives you no persistent disk (e.g. plain
serverless) will not work as-is — SQLite and local media need durable storage.
