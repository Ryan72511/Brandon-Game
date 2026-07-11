# 🍿 Reely — Tiny shows. Big feelings.

Reely is a mobile-first streaming platform for **short, wide-screen (16:9) mini-shows** —
microdramas, one-minute comedies, tiny mysteries — think *TikTok's ease, Netflix's format,
Facebook's friends*. Anyone can watch; anyone can flip into **Creating** mode and become
a celebrated creator.

## What's inside

| Pillar | What you get |
|---|---|
| **Watch** | Vertical-scroll feed of 16:9 videos, autoplay, scrub bar with comment tick-marks, auto-advance, next-episode binge button |
| **Channels** | Make your own TV-style channel for any category, save videos to it, share it with a link, follow others' channels |
| **Prebuilt lineup** | 10 curated channels (The Laugh Track, Mini Dramas, Whodunit Lane…), plus **Surprise Me** (daily personalized shuffle) and **This Week's Best** (auto-populated from the chart) |
| **Popcorn ratings** | Tap **Pop it** → Burnt / Popped / Extra Butter. Videos earn a Bayesian-smoothed "% popped" score; under 5 ratings they show "Just popped" instead of a number |
| **Charts** | Top This Week + All-Time Greats |
| **Timecoded comments** | Comments pin to a moment; tapping the time chip seeks the video |
| **Two modes** | Airbnb-style toggle between **Watching** and **Creating** — the whole nav re-skins |
| **Creator celebration** | Per-video backstory ("how I made it"), creator pages with about / tools & equipment / process, mini-series with auto-numbered episodes |
| **Friends & profiles** | Everyone gets a profile; add friends by username, accept/decline requests |
| **Recommendations** | Deterministic content-based recs from your saves, ratings, and watch history — with "Because you like…" reasons; per-channel "add these?" suggestions |
| **Continue watching** | Unfinished videos lead your feed and resume where you left off |
| **Search** | Find videos, creators, and channels from the storefront |
| **Notifications** | Friend activity and new videos in channels you follow — "What's new" inbox + tab badge |
| **Captions** | Creators add WebVTT captions; viewers toggle CC on the player |
| **Creator studio** | Per-video analytics (views, 7-day trend, completion rate), edit/delete, drafts, mini-series management, pinned comments |

## Run it

```bash
npm install
npm run setup      # creates SQLite DB, generates seed videos (needs ffmpeg), seeds data
npm run dev        # http://localhost:3000
```

Demo sign-in: **`demo` / `reely123`** (all seeded users share that password).

Without ffmpeg, skip `media:generate` — the seed videos are committed under `media/`.

## Verify

```bash
npm test                          # unit tests (scoring, shuffle determinism)
npm run build && npm start        # then:
node tests/e2e/flows.test.mjs http://localhost:3000   # 24 end-to-end browser flows
```

## Codebase map

```
app/                 Next.js App Router pages + API route handlers
  page.tsx           Watch feed (home)
  watch/[id]         Deep-linkable watch feed with channel/series context
  channel/[slug]     Channel page (share target)
  channels, charts, you, friends, creator/[username]
  studio, studio/upload, studio/profile     Creating mode
  api/               auth, videos, ratings, comments, channels, friends…
  media/[...path]    Range-supporting media streamer (CDN stand-in)
components/          UI (WatchFeed + sheets, cards, forms, TabBar)
lib/                 db, session, score, recs, charts, storage, data DTOs
prisma/              schema + seed
scripts/             seed content specs + ffmpeg video generation
tests/               unit + e2e (Playwright)
docs/ARCHITECTURE.md How this scales to millions of users, and the App Store path
```

## Status & path to the App Store

This is the **MVP web app** — the product is fully usable in a mobile browser today.
The App Store build wraps this same app with Capacitor (WKWebView); the scale-up plan
(Postgres, object storage + CDN, HLS transcoding via Mux, Redis, real recsys) is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Creator monetization is deliberately
out of scope until the audience exists.
