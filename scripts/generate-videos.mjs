// Generates the seed video files + thumbnails with ffmpeg: animated gradient
// backgrounds, the title drawn on, and a gentle tone track. Real, playable
// 16:9 H.264 clips — stand-ins for licensed launch content.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VIDEOS, CATEGORY_STYLE, SERIES } from "./seed-data.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const videosDir = path.join(root, "media", "videos");
const thumbsDir = path.join(root, "media", "thumbs");
mkdirSync(videosDir, { recursive: true });
mkdirSync(thumbsDir, { recursive: true });

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// drawtext is picky: strip characters that need escaping.
function safeText(s) {
  return s.replace(/[':\\%,]/g, "").trim();
}

const seriesByKey = Object.fromEntries(SERIES.map((s) => [s.key, s]));
let generated = 0;
let skipped = 0;

for (const [i, v] of VIDEOS.entries()) {
  const outVideo = path.join(videosDir, `${v.slug}.mp4`);
  const outWebm = path.join(videosDir, `${v.slug}.webm`);
  const outThumb = path.join(thumbsDir, `${v.slug}.jpg`);
  if (existsSync(outVideo) && existsSync(outWebm) && existsSync(outThumb)) {
    skipped++;
    continue;
  }

  const [c0, c1] = CATEGORY_STYLE[v.category] ?? ["555555", "999999"];
  const title = safeText(v.title);
  const sub = v.series
    ? safeText(`${seriesByKey[v.series].title} — Episode ${v.ep}`)
    : safeText(v.category.toUpperCase());
  const freq = 220 + (i % 8) * 55; // vary the tone per video
  const freq2 = freq * 1.5;

  const drawtext =
    `drawtext=fontfile=${FONT}:text='${title}':fontcolor=white:fontsize=40:` +
    `x=(w-text_w)/2:y=(h-text_h)/2-24:shadowcolor=black@0.4:shadowx=2:shadowy=2,` +
    `drawtext=fontfile=${FONT}:text='${sub}':fontcolor=white@0.75:fontsize=20:` +
    `x=(w-text_w)/2:y=(h)/2+28,` +
    `drawtext=fontfile=${FONT}:text='gasp':fontcolor=white@0.5:fontsize=16:x=w-tw-16:y=h-th-12`;

  execFileSync("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `gradients=s=1280x720:c0=0x${c0}:c1=0x${c1}:x0=0:y0=0:x1=1280:y1=720:d=${v.dur}:speed=0.6`,
    "-f", "lavfi",
    "-i", `sine=frequency=${freq}:duration=${v.dur}`,
    "-f", "lavfi",
    "-i", `sine=frequency=${freq2}:duration=${v.dur}`,
    "-filter_complex",
    `[0:v]${drawtext}[vout];[1:a][2:a]amix=inputs=2:duration=first,volume=0.12[aout]`,
    "-map", "[vout]", "-map", "[aout]",
    "-t", String(v.dur),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "48k",
    "-movflags", "+faststart",
    outVideo,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  // WebM (VP8) rendition — some Chromium builds ship without H.264, and a
  // real pipeline produces multiple renditions anyway. The player offers
  // both via <source> tags.
  execFileSync("ffmpeg", [
    "-y", "-i", outVideo,
    "-c:v", "libvpx", "-b:v", "600k", "-deadline", "realtime", "-cpu-used", "5",
    "-c:a", "libvorbis", "-b:a", "48k",
    outWebm,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  execFileSync("ffmpeg", [
    "-y", "-ss", String(Math.min(2, v.dur / 2)), "-i", outVideo,
    "-frames:v", "1", "-vf", "scale=640:360", "-q:v", "5", outThumb,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  generated++;
}

console.log(`Videos: ${generated} generated, ${skipped} already present (${VIDEOS.length} total).`);
