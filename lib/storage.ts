// Storage abstraction. Local implementation writes to ./media on disk and
// serves through /media/[...path] (with HTTP Range support for scrubbing).
// The production swap is S3/R2 presigned uploads + CDN — only this file and
// the /media route change; every stored URL keeps working because callers
// only ever see the returned `url`.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const MEDIA_ROOT = path.join(process.cwd(), "media");

const EXT_ALLOWLIST = new Set(["mp4", "webm", "mov", "m4v", "jpg", "jpeg", "png", "webp", "gif"]);

// Everything user-uploaded (videos AND their poster frames) lands in
// media/uploads — gitignored, unlike the committed seed media.
export async function saveUpload(
  buffer: Buffer,
  ext: string,
  kind: "uploads" = "uploads"
): Promise<{ url: string }> {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!EXT_ALLOWLIST.has(safeExt)) throw new Error(`Unsupported file type: ${ext}`);
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${safeExt}`;
  const dir = path.join(MEDIA_ROOT, kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/media/${kind}/${name}` };
}

export const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
