// In-process token-bucket rate limiter. Per instance, resets on deploy —
// good enough to stop abuse at MVP scale; swaps to Redis at multi-instance.
interface Bucket {
  tokens: number;
  refilledAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

export interface RateLimit {
  perMinute: number;
  burst?: number;
}

export const LIMITS = {
  // Per-account brute-force limit (login/reset): 10 tries/min against a
  // single username, regardless of source IP.
  auth: { perMinute: 10, burst: 8 },
  // Per-IP flood ceiling for auth endpoints — generous so shared NAT IPs
  // (homes, schools) aren't locked out.
  authIp: { perMinute: 40, burst: 30 },
  write: { perMinute: 60, burst: 30 }, // comments, ratings, saves, follows
  upload: { perMinute: 2, burst: 3 }, // video/cover uploads
  create: { perMinute: 6, burst: 6 }, // channels, friend requests
  // View/progress pings fire every few seconds while scrolling a feed.
  telemetry: { perMinute: 240, burst: 120 },
} as const;

// Derive the client IP from a hop we actually trust. X-Forwarded-For is
// attacker-appendable from the left — trusting the left-most entry lets a
// client mint a fresh IP per request and walk straight past the per-IP
// limiter. Configure ONE of these in production:
//
//   TRUSTED_CLIENT_IP_HEADER — the name of your platform's real-IP header
//     (e.g. "cf-connecting-ip", "fly-client-ip", "x-real-ip"). When set, that
//     header is authoritative and X-Forwarded-For is ignored entirely.
//   TRUSTED_PROXY_HOPS — how many proxies you control append to XFF. We take
//     the Nth entry from the right (default 1 = right-most), which is the
//     value written by your own edge, not by the client.
//
// With neither set (local dev, no proxy) we fall back to the left-most XFF
// entry — fine on localhost, unsafe behind a real proxy.
export function clientIp(req: Request): string {
  const trustedHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (trustedHeader) {
    const value = req.headers.get(trustedHeader);
    // Platform headers hold a single address; split defensively anyway.
    return value ? value.split(",")[0].trim() || "local" : "local";
  }
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return "local";
  const entries = fwd
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return "local";
  const hopsRaw = process.env.TRUSTED_PROXY_HOPS;
  if (hopsRaw) {
    const parsed = Number.parseInt(hopsRaw, 10);
    const hops = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
    // N trusted hops → the Nth-from-right entry is the connecting client as
    // seen by the outermost proxy we control. Clamp so a short (spoof-only)
    // list can't index past the left edge.
    return entries[Math.max(0, entries.length - hops)];
  }
  // Dev fallback only — trusts the client-controlled left-most entry.
  return entries[0];
}

function getBucket(key: string, capacity: number, now: number): Bucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict the oldest tenth — never wipe active limits wholesale, or an
      // attacker could flush the auth limiter by churning keys.
      let evicted = 0;
      for (const k of buckets.keys()) {
        buckets.delete(k);
        if (++evicted >= MAX_BUCKETS / 10) break;
      }
    }
    bucket = { tokens: capacity, refilledAt: now };
    buckets.set(key, bucket);
  }
  return bucket;
}

function refill(bucket: Bucket, limit: RateLimit, now: number) {
  const capacity = limit.burst ?? limit.perMinute;
  const elapsed = (now - bucket.refilledAt) / 60_000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * limit.perMinute);
  bucket.refilledAt = now;
}

// Consume-on-check: refill, and if a token is available take it. Use for
// per-request limits (writes, uploads, IP floods).
export function allowRequest(key: string, limit: RateLimit): boolean {
  const now = Date.now();
  const bucket = getBucket(key, limit.burst ?? limit.perMinute, now);
  refill(bucket, limit, now);
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// Peek without consuming — for failure-counted auth limits, so a legitimate
// login/reset with the right credentials never spends a token (an attacker
// can't lock a victim out by guessing their username).
export function isBlocked(key: string, limit: RateLimit): boolean {
  const now = Date.now();
  const bucket = getBucket(key, limit.burst ?? limit.perMinute, now);
  refill(bucket, limit, now);
  return bucket.tokens < 1;
}

// Record one failed attempt against a key (spends a token).
export function recordFailure(key: string, limit: RateLimit): void {
  const now = Date.now();
  const bucket = getBucket(key, limit.burst ?? limit.perMinute, now);
  refill(bucket, limit, now);
  bucket.tokens = Math.max(0, bucket.tokens - 1);
}
