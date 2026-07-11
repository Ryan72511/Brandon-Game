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
  auth: { perMinute: 5, burst: 5 }, // login/signup attempts
  write: { perMinute: 60, burst: 30 }, // comments, ratings, saves, follows
  upload: { perMinute: 2, burst: 3 }, // video/cover uploads
  create: { perMinute: 6, burst: 6 }, // channels, friend requests
  // View/progress pings fire every few seconds while scrolling a feed.
  telemetry: { perMinute: 240, burst: 120 },
} as const;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "local";
}

// Returns true when the request is allowed.
export function allowRequest(key: string, limit: RateLimit): boolean {
  const now = Date.now();
  const capacity = limit.burst ?? limit.perMinute;
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
  // Refill continuously at perMinute rate.
  const elapsed = (now - bucket.refilledAt) / 60_000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * limit.perMinute);
  bucket.refilledAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}
