"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATEGORY_LABELS, MAX_VIDEO_SECONDS } from "@/lib/constants";

// Upload with client-side probing: we read duration and grab a poster frame
// in the browser (no server transcoding at MVP), and warn when the video
// isn't roughly 16:9 — Reely is a wide-screen, TV-style place.
export default function UploadForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [probing, setProbing] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [aspectWarning, setAspectWarning] = useState("");
  const [durationError, setDurationError] = useState("");
  const [posterBlob, setPosterBlob] = useState<Blob | null>(null);
  const [posterUrl, setPosterUrl] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [backstory, setBackstory] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pickFile(f: File | null) {
    setFile(f);
    setDuration(null);
    setAspectWarning("");
    setDurationError("");
    setPosterBlob(null);
    setPosterUrl("");
    if (!f) return;
    setProbing(true);

    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const d = Math.round(video.duration);
      setDuration(d);
      if (d > MAX_VIDEO_SECONDS) {
        setDurationError(
          `That's ${Math.round(d / 60)} minutes — Reely videos are ${MAX_VIDEO_SECONDS / 60} minutes or less. Trim it and try again.`
        );
      }
      const ratio = video.videoWidth / video.videoHeight;
      if (ratio < 1.5) {
        setAspectWarning(
          "This video is quite tall. Reely is a wide-screen (16:9) place — it will show with black bars on the sides."
        );
      }
      // Grab a poster frame a second in.
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPosterBlob(blob);
            setPosterUrl(URL.createObjectURL(blob));
          }
          setProbing(false);
          URL.revokeObjectURL(url);
        },
        "image/jpeg",
        0.8
      );
    };
    video.onerror = () => {
      setProbing(false);
      URL.revokeObjectURL(url);
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy || durationError) return;
    setBusy(true);
    setError("");

    const form = new FormData();
    form.set("file", file);
    if (posterBlob) form.set("poster", posterBlob, "poster.jpg");
    form.set("title", title);
    form.set("description", description);
    form.set("backstory", backstory);
    form.set("category", category);
    form.set("tags", tags);
    form.set("durationSec", String(duration ?? 60));
    if (seriesTitle.trim()) form.set("seriesTitle", seriesTitle.trim());

    const res = await fetch("/api/videos", { method: "POST", body: form });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/watch/${data.videoId}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed. Try again.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        ref={fileInput}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed p-4 ${
          file ? "border-good bg-surface" : "border-line bg-surface"
        }`}
      >
        {file ? (
          <>
            <span className="text-3xl" aria-hidden>
              ✅
            </span>
            <span className="font-bold">{file.name}</span>
            <span className="text-[14px] text-ink-soft">
              {probing ? "Reading video…" : duration !== null ? `${duration}s` : ""} · tap to
              change
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl" aria-hidden>
              🎥
            </span>
            <span className="font-bold">Pick your video</span>
            <span className="text-[14px] text-ink-soft">
              Wide (16:9) works best · up to {MAX_VIDEO_SECONDS / 60} minutes
            </span>
          </>
        )}
      </button>

      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt="Preview of your video"
          className="aspect-video w-full rounded-2xl border border-line object-cover"
        />
      )}
      {aspectWarning && (
        <p className="rounded-2xl bg-gold-soft p-3 text-[15px] font-semibold">⚠️ {aspectWarning}</p>
      )}
      {durationError && (
        <p className="rounded-2xl bg-accent-soft p-3 text-[15px] font-semibold text-accent">
          {durationError}
        </p>
      )}

      <label className="flex flex-col gap-1 font-semibold">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give it a great name"
          maxLength={80}
          required
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        >
          <option value="" disabled>
            Pick one…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        One-line description <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        The story behind it <span className="font-normal text-ink-soft">(optional — viewers love this)</span>
        <textarea
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="How you made it, why, what went wrong, bloopers…"
          maxLength={2000}
          rows={3}
          className="rounded-2xl border-2 border-line bg-surface p-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        Part of a mini-series? <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={seriesTitle}
          onChange={(e) => setSeriesTitle(e.target.value)}
          placeholder="Series name — episodes number themselves"
          maxLength={80}
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        Tags <span className="font-normal text-ink-soft">(optional, comma-separated)</span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="dogs, sitcom, office"
          maxLength={200}
          className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      {error && <p className="font-semibold text-accent">{error}</p>}

      <button
        type="submit"
        disabled={!file || !title.trim() || !category || busy || probing || Boolean(durationError)}
        className="min-h-16 rounded-2xl bg-accent text-xl font-bold text-white disabled:opacity-40"
      >
        {busy ? "Uploading…" : "Put it on Reely 🍿"}
      </button>
    </form>
  );
}
