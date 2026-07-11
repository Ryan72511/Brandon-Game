import { NextResponse } from "next/server";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { invalidateCandidateCache } from "@/lib/recs";
import { CATEGORIES } from "@/lib/constants";
import { MEDIA_ROOT } from "@/lib/storage";

type Params = [{ params: Promise<{ id: string }> }];

// Edit your own video's metadata. Fields are optional — only what the
// client sends gets updated.
export const PATCH = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { creatorId: true } });
  if (!video) return jsonError("Video not found.", 404);
  if (video.creatorId !== user.id) return jsonError("This isn't your video.", 403);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: {
    title?: string;
    description?: string;
    backstory?: string;
    category?: string;
    tags?: string;
    status?: string;
    captionsVtt?: string;
  } = {};

  if (body.title !== undefined) {
    const title = cleanString(body.title, 80);
    if (!title) return jsonError("Give your video a title.", 400);
    data.title = title;
  }
  if (body.description !== undefined) data.description = cleanString(body.description, 300);
  if (body.backstory !== undefined) data.backstory = cleanString(body.backstory, 2000);
  if (body.category !== undefined) {
    const category = cleanString(body.category, 20);
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      return jsonError("Pick a category.", 400);
    }
    data.category = category;
  }
  if (body.tags !== undefined) {
    data.tags = JSON.stringify(
      cleanString(body.tags, 200)
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    );
  }
  if (body.status !== undefined) {
    if (body.status !== "draft" && body.status !== "published") {
      return jsonError("Status can be draft or published.", 400);
    }
    data.status = body.status;
  }
  if (body.captionsVtt !== undefined) data.captionsVtt = cleanString(body.captionsVtt, 20000);

  await prisma.video.update({ where: { id }, data });
  invalidateCandidateCache();
  return NextResponse.json({ ok: true });
});

// Best-effort cleanup of uploaded media. Seed files live in /media/videos
// and are shared demo content — only user uploads (/media/uploads) are
// deleted, and a failed unlink never fails the request.
async function unlinkUploadedMedia(url: string) {
  if (!url.startsWith("/media/uploads/")) return;
  const uploadsDir = path.join(MEDIA_ROOT, "uploads");
  const file = path.resolve(MEDIA_ROOT, url.slice("/media/".length));
  if (!file.startsWith(uploadsDir + path.sep)) return; // no traversal
  await unlink(file).catch(() => {});
}

export const DELETE = withUser<Params>(async (user, _req, { params }) => {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    select: { creatorId: true, src: true, thumb: true },
  });
  if (!video) return jsonError("Video not found.", 404);
  if (video.creatorId !== user.id) return jsonError("This isn't your video.", 403);

  // Relations (ratings, comments, watch events, channel refs) cascade.
  await prisma.video.delete({ where: { id } });
  await unlinkUploadedMedia(video.src);
  await unlinkUploadedMedia(video.thumb);
  invalidateCandidateCache();
  return NextResponse.json({ ok: true });
});
