// Streams media files (seed videos, thumbnails, user uploads) with HTTP
// Range support so <video> scrubbing works. In production this whole route
// is replaced by a CDN in front of object storage.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MEDIA_ROOT, MIME_BY_EXT } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isPublicVideo } from "@/lib/visibility";
import { isAdult } from "@/lib/age";

// User-uploaded bytes must obey the same visibility rules as the metadata:
// a moderator-removed, draft, pending, scheduled, suspended-creator, or
// mature video's file is not served to people who shouldn't see it. Seed
// media under /media/videos + /media/thumbs is curated public content and
// stays open. Returns true if the request may proceed, false → 404.
async function uploadAllowed(parts: string[]): Promise<boolean> {
  if (parts[0] !== "uploads") return true; // seed content is public
  const url = "/media/" + parts.join("/");
  const video = await prisma.video.findFirst({
    where: { OR: [{ src: url }, { thumb: url }] },
    select: {
      creatorId: true,
      status: true,
      publishAt: true,
      mature: true,
      creator: { select: { suspended: true } },
    },
  });
  // Orphaned upload (no video references it) — never serve it.
  if (!video) return false;
  const viewer = await getCurrentUser();
  if (viewer && (viewer.id === video.creatorId || viewer.role === "admin")) return true;
  if (!isPublicVideo(video) || video.creator.suspended) return false;
  if (video.mature && !isAdult(viewer?.birthYear)) return false;
  return true;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const filePath = path.join(MEDIA_ROOT, ...parts);
  // Guard against path traversal — resolved path must stay inside MEDIA_ROOT.
  if (!path.resolve(filePath).startsWith(path.resolve(MEDIA_ROOT) + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  // Enforce visibility on user uploads (removed/draft/mature/suspended).
  if (!(await uploadAllowed(parts))) {
    return new Response("Not found", { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("not a file");
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const size = fileStat.size;
  const range = req.headers.get("range");

  // Seed content is immutably public; gated uploads must revalidate so a
  // shared cache can't keep serving a video after it's removed, and never
  // MIME-sniff (uploads are extension-validated, not content-validated).
  const isUpload = parts[0] === "uploads";
  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": isUpload
      ? "private, no-cache"
      : "public, max-age=31536000, immutable",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? parseInt(match[1], 10) : 0;
    let end = match?.[2] ? parseInt(match[2], 10) : size - 1;
    if (Number.isNaN(start) || start >= size) start = 0;
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start > end) [start, end] = [0, size - 1];
    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
