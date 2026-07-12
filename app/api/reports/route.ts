import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { LIMITS } from "@/lib/ratelimit";

// Allowed report reasons — keep in sync with the labels on the admin page.
const REASONS = ["not_for_kids", "harmful", "hateful", "copyright", "spam", "other"];
const TARGET_TYPES = ["video", "creator", "comment"];

// POST { targetType, targetId, reason, detail? } — file a report.
// Duplicate open reports from the same person on the same target are
// silently deduped so mashing the button can't flood the queue.
export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const targetType = typeof body.targetType === "string" ? body.targetType : "";
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const detail = cleanString(body.detail, 500);

  if (!TARGET_TYPES.includes(targetType)) return jsonError("Unknown report target.", 400);
  if (!targetId) return jsonError("Missing target.", 400);
  if (!REASONS.includes(reason)) return jsonError("Pick a reason for the report.", 400);

  let videoId: string | null = null;
  let creatorId: string | null = null;
  let commentId: string | null = null;

  if (targetType === "video") {
    const video = await prisma.video.findUnique({
      where: { id: targetId },
      select: { id: true, creatorId: true },
    });
    if (!video) return jsonError("Video not found.", 404);
    if (video.creatorId === user.id) return jsonError("You can't report your own video.", 400);
    videoId = video.id;
    creatorId = video.creatorId;
  } else if (targetType === "creator") {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) return jsonError("Creator not found.", 404);
    if (target.id === user.id) return jsonError("You can't report yourself.", 400);
    creatorId = target.id;
  } else {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: { id: true, videoId: true, userId: true },
    });
    if (!comment) return jsonError("Comment not found.", 404);
    if (comment.userId === user.id) return jsonError("You can't report your own comment.", 400);
    commentId = comment.id;
    videoId = comment.videoId;
    creatorId = comment.userId;
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId: user.id,
      status: "open",
      targetType,
      ...(targetType === "video"
        ? { videoId }
        : targetType === "creator"
          ? { creatorId }
          : { commentId }),
    },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true });

  await prisma.report.create({
    data: { reporterId: user.id, targetType, videoId, creatorId, commentId, reason, detail },
  });
  return NextResponse.json({ ok: true });
}, LIMITS.create);
