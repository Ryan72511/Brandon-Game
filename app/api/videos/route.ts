import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { saveUpload } from "@/lib/storage";
import { CATEGORIES, MAX_UPLOAD_BYTES, MAX_VIDEO_SECONDS } from "@/lib/constants";

// Creating-mode upload. The browser extracts duration + a poster frame
// client-side (no server-side transcoding at MVP; see docs/ARCHITECTURE.md
// for the Mux/HLS production pipeline this slots into).
export const POST = withUser(async (user, req) => {
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Upload didn't come through. Try again.", 400);

  const file = form.get("file");
  const poster = form.get("poster");
  if (!(file instanceof File)) return jsonError("Pick a video file first.", 400);
  if (file.size === 0) return jsonError("That file looks empty.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("Videos can be up to 200 MB.", 400);

  const title = cleanString(form.get("title"), 80);
  if (!title) return jsonError("Give your video a title.", 400);
  const description = cleanString(form.get("description"), 300);
  const backstory = cleanString(form.get("backstory"), 2000);
  const category = cleanString(form.get("category"), 20);
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return jsonError("Pick a category.", 400);
  }
  const tags = cleanString(form.get("tags"), 200)
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  const durationRaw = Number(form.get("durationSec"));
  const durationSec = Number.isFinite(durationRaw)
    ? Math.min(Math.max(Math.round(durationRaw), 1), MAX_VIDEO_SECONDS)
    : 60;

  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const videoBuffer = Buffer.from(await file.arrayBuffer());
  const { url: src } = await saveUpload(videoBuffer, ext, "uploads");

  let thumb = "/poster-fallback.svg";
  if (poster instanceof File && poster.size > 0) {
    const posterBuffer = Buffer.from(await poster.arrayBuffer());
    const saved = await saveUpload(posterBuffer, "jpg");
    thumb = saved.url;
  }

  // Optional mini-series attachment: reuse the creator's series by title,
  // or create it. Episode number defaults to next-in-series.
  const seriesTitle = cleanString(form.get("seriesTitle"), 80);
  let seriesId: string | null = null;
  let episodeNumber: number | null = null;
  if (seriesTitle) {
    const series =
      (await prisma.series.findFirst({
        where: { creatorId: user.id, title: seriesTitle },
      })) ??
      (await prisma.series.create({
        data: { creatorId: user.id, title: seriesTitle },
      }));
    seriesId = series.id;
    const last = await prisma.video.findFirst({
      where: { seriesId },
      orderBy: { episodeNumber: "desc" },
      select: { episodeNumber: true },
    });
    episodeNumber = (last?.episodeNumber ?? 0) + 1;
  }

  const video = await prisma.video.create({
    data: {
      creatorId: user.id,
      title,
      description,
      backstory,
      src,
      thumb,
      durationSec,
      category,
      tags: JSON.stringify(tags),
      seriesId,
      episodeNumber,
    },
  });

  return NextResponse.json({ ok: true, videoId: video.id });
});
