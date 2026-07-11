// Which videos are public: published, and past any scheduled publish time.
// Drafts and future-scheduled videos are visible only to their creator.
export function publicVideoWhere(now = new Date()) {
  return {
    status: "published",
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
  };
}

export function isPublicVideo(v: { status: string; publishAt: Date | null }, now = new Date()) {
  return v.status === "published" && (!v.publishAt || v.publishAt <= now);
}
