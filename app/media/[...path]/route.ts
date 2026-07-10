// Streams media files (seed videos, thumbnails, user uploads) with HTTP
// Range support so <video> scrubbing works. In production this whole route
// is replaced by a CDN in front of object storage.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MEDIA_ROOT, MIME_BY_EXT } from "@/lib/storage";

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

  const baseHeaders: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
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
