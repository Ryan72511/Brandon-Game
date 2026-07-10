# Reely architecture — today, and at millions of users

## Design principle

Every MVP choice was made so the scale-up is a **swap, not a rewrite**:

- IDs are `cuid()` — portable to Postgres, no autoincrement coupling.
- Enum-like fields are strings validated at the API boundary — converts to native
  Postgres enums with one migration.
- Rating counters are **recomputed from the Rating table inside the same transaction**
  as every write — the denormalized cache can never drift, and the same code works
  when the cache moves to Redis.
- All media URLs are opaque strings served by one route (`/media/...`) — swapping in
  S3+CDN changes `lib/storage.ts` and nothing else.
- Recommendations, Surprise Me, and charts are pure functions behind stable
  interfaces (`recommendForUser`, `surpriseMe`, `getChart`) — internals can go from
  tag-overlap to embeddings without touching callers.
- Watch history is an append-only event table — the shape Kafka/ClickHouse want later.

## Today (MVP)

```
Next.js 15 (App Router, TS) ── Prisma ── SQLite (WAL)
        │
        └── /media/[...path] range-streaming from local disk
            seed content: ffmpeg-generated H.264 MP4 + VP8 WebM renditions
```

- **Auth**: username + scrypt-hashed password, DB-backed session cookie (httpOnly).
- **Popcorn Score**: `100·(fresh + m/2)/(total + m)` — Bayesian smoothing, prior
  weight `m=5` all-time / `m=3` weekly; scores hidden under 5 ratings ("Just popped").
- **Charts**: computed on demand, 60s in-process cache; weekly = ratings in last 7
  days (min 3), all-time = cached score (min 5).
- **Surprise Me**: seeded Fisher–Yates shuffle, seed = `fnv1a(userId + day)` —
  deterministic per user per day, quality pool + every-5th-slot newcomer splice.
- **Recs**: taste vector from saves (w=3) + positive ratings (w=2) + watches (w=1)
  over categories/tags, scored against candidates with quality/popularity/recency
  boosts. Deterministic, testable, fine to ~50k videos.
- **Uploads**: browser extracts duration + poster frame (canvas); server stores the
  original file. One rendition, no transcoding — deliberate MVP cut.

## The scale-up path (in order)

| Trigger | Swap | Technology |
|---|---|---|
| **Day ~30, regardless of users** | Local video files → object storage + CDN, client uploads via presigned PUT | S3 or Cloudflare R2 + CloudFront |
| Same milestone | No transcoding → managed HLS pipeline (upload URL in, adaptive ladder + thumbnails out, webhook marks video ready) | **Mux Video** (buy, don't build); self-host escape hatch: S3→SQS→Fargate ffmpeg→MediaConvert, hls.js player |
| ~10k users or first `SQLITE_BUSY` | SQLite → Postgres 16 (provider swap + one migration); partition WatchEvent by month; read replica for feeds | Neon / RDS + PgBouncer |
| Charts feel slow | On-demand computation → precomputed `ChartEntry` rows refreshed by a job (keep old weeks: free "past winners" pages) | BullMQ + Redis (Upstash/ElastiCache) |
| Feed p95 rises | Per-user Surprise-Me/rec lists cached (they're already deterministic per day — cache key is the seed) | Redis |
| View writes dominate | WatchEvent inserts → event stream; Postgres keeps only aggregates | Kafka/Kinesis → ClickHouse |
| Recs plateau | Tag overlap → embeddings: pgvector column (title+tags+description), user vector = weighted mean of interactions, ANN + rerank. Two-tower model only after that plateaus | pgvector, text-embedding-3-small |
| Search demand | — add | Typesense / Meilisearch synced from Postgres |
| Real auth needs (email recovery, OAuth) | scrypt sessions → managed auth | Auth.js or Clerk |

## App Store path

The app is a responsive web app by design. Ship it natively by wrapping with
**Capacitor** (WKWebView): same codebase, add native share sheet + push notifications
plugins, submit to the App Store. If native-feel scrolling ever becomes the
bottleneck, the API layer already speaks JSON to any client — a React Native or
SwiftUI client can be built against it without backend changes.

## Moderation & safety (pre-launch requirement)

Not built yet, deliberately scoped for launch week: report button writing to a
`Report` table, an admin review queue, upload rate limits, and a blocklist filter
on comments. The schema and API middleware layout make these additive.
