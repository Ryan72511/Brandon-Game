// Which videos are public: published, past any scheduled publish time, and
// from a creator in good standing. Drafts, pending-review, removed, and
// suspended-creator videos are never public (creators still see their own
// drafts/pending/removed in their studio).
export function publicVideoWhere(now = new Date()) {
  return {
    status: "published",
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    creator: { suspended: false },
  };
}

export function isPublicVideo(v: { status: string; publishAt: Date | null }, now = new Date()) {
  return v.status === "published" && (!v.publishAt || v.publishAt <= now);
}

// Whether pre-publication review is on: new uploads land in the moderation
// queue instead of publishing instantly. Off in local dev so the demo flows
// stay one-step; ON for the App Store build.
export function reviewModeEnabled(): boolean {
  return process.env.REELY_REVIEW_MODE === "1";
}
