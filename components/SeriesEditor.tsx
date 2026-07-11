"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/lib/useAction";
import { Field, TextInput, TextArea, SubmitButton } from "@/components/Field";

interface Episode {
  id: string;
  episodeNumber: number | null;
  title: string;
  thumb: string;
}

// Rename a series and reorder its episodes. Every reorder round-trips to
// the server then refreshes, so the numbers on screen are always real.
export default function SeriesEditor({
  series,
  episodes,
}: {
  series: { id: string; title: string; description: string };
  episodes: Episode[];
}) {
  const save = useAction();
  const reorder = useAction();
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const data = await save.run(
      `/api/series/${series.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      },
      { refresh: true }
    );
    if (data) setSaved(true);
  }

  async function move(videoId: string, direction: "up" | "down") {
    await reorder.run(
      `/api/series/${series.id}/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, direction }),
      },
      { refresh: true }
    );
  }

  const arrowClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border-2 border-line bg-surface text-lg font-bold disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Series name">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
          />
        </Field>
        <Field label="Description" hint="optional">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
          />
        </Field>
        {save.error && <p className="font-semibold text-accent">{save.error}</p>}
        {saved && <p className="font-semibold text-good">Saved ✓</p>}
        <SubmitButton busy={save.busy}>Save changes</SubmitButton>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Episodes</h2>
        {episodes.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-[15px] text-ink-soft shadow-card">
            No episodes yet — add one from the upload form using this series name.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {episodes.map((ep, i) => (
              <li
                key={ep.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-card"
              >
                <span className="w-8 shrink-0 text-center font-bold text-ink-soft">
                  {ep.episodeNumber ?? "—"}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ep.thumb}
                  alt=""
                  className="aspect-video w-20 shrink-0 rounded-lg border border-line object-cover"
                />
                <Link
                  href={`/studio/video/${ep.id}`}
                  className="line-clamp-2 min-w-0 flex-1 font-semibold"
                >
                  {ep.title}
                </Link>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(ep.id, "up")}
                    disabled={reorder.busy || i === 0}
                    aria-label={`Move "${ep.title}" up`}
                    className={arrowClass}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(ep.id, "down")}
                    disabled={reorder.busy || i === episodes.length - 1}
                    aria-label={`Move "${ep.title}" down`}
                    className={arrowClass}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {reorder.error && <p className="font-semibold text-accent">{reorder.error}</p>}
      </section>
    </div>
  );
}
