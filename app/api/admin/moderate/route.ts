import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { invalidateCandidateCache } from "@/lib/recs";

// Marks a report resolved (no-op when reportId is absent or already closed).
async function resolveReport(reportId: unknown, resolution: string) {
  if (typeof reportId !== "string" || !reportId) return;
  await prisma.report.updateMany({
    where: { id: reportId, status: "open" },
    data: { status: "resolved", resolution, resolvedAt: new Date() },
  });
}

// Closes EVERY open report on a target once it's actioned — so acting on one
// report clears the others about the same video/creator/comment instead of
// leaving orphaned open rows in the queue.
async function resolveReportsForTarget(
  where: { videoId?: string; creatorId?: string; commentId?: string },
  resolution: string
) {
  await prisma.report.updateMany({
    where: { ...where, status: "open" },
    data: { status: "resolved", resolution, resolvedAt: new Date() },
  });
}

// POST { action, ... } — every moderation decision goes through here.
// Admin-only; every branch answers { ok: true } on success.
export const POST = withUser(async (user, req) => {
  if (user.role !== "admin") return jsonError("Admins only.", 403);
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "resolve_report") {
    if (typeof body.reportId !== "string" || body.resolution !== "dismissed") {
      return jsonError("Bad request.", 400);
    }
    await resolveReport(body.reportId, "dismissed");
    return NextResponse.json({ ok: true });
  }

  if (action === "remove_video" || action === "restore_video") {
    const videoId = typeof body.videoId === "string" ? body.videoId : "";
    const updated = await prisma.video.updateMany({
      where: { id: videoId },
      data: { status: action === "remove_video" ? "removed" : "published" },
    });
    if (updated.count === 0) return jsonError("Video not found.", 404);
    invalidateCandidateCache();
    if (action === "remove_video") {
      await resolveReportsForTarget({ videoId }, "video_removed");
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "approve_video" || action === "reject_video") {
    const videoId = typeof body.videoId === "string" ? body.videoId : "";
    // Guarded update: only videos still in the review queue can be decided.
    const updated = await prisma.video.updateMany({
      where: { id: videoId, status: "pending" },
      data: { status: action === "approve_video" ? "published" : "removed" },
    });
    if (updated.count === 0) return jsonError("That video isn't waiting for review.", 409);
    if (action === "approve_video") invalidateCandidateCache();
    return NextResponse.json({ ok: true });
  }

  if (action === "suspend_user") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) return jsonError("User not found.", 404);
    if (target.role === "admin") return jsonError("Admins can't be suspended.", 403);
    await prisma.user.update({ where: { id: target.id }, data: { suspended: true } });
    // Sign them out everywhere immediately.
    await prisma.session.deleteMany({ where: { userId: target.id } });
    invalidateCandidateCache();
    await resolveReportsForTarget({ creatorId: target.id }, "creator_suspended");
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuspend_user") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const updated = await prisma.user.updateMany({
      where: { id: userId },
      data: { suspended: false },
    });
    if (updated.count === 0) return jsonError("User not found.", 404);
    invalidateCandidateCache();
    return NextResponse.json({ ok: true });
  }

  if (action === "remove_comment") {
    const commentId = typeof body.commentId === "string" ? body.commentId : "";
    if (!commentId) return jsonError("Missing comment.", 400);
    // Idempotent: the comment may already be gone (deleted, or removed via
    // another report) — resolving the report is still the right outcome.
    await prisma.comment.deleteMany({ where: { id: commentId } });
    await resolveReportsForTarget({ commentId }, "comment_removed");
    return NextResponse.json({ ok: true });
  }

  return jsonError("Unknown action.", 400);
});
