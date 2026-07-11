"use client";

import { useState } from "react";
import { useAction } from "@/lib/useAction";
import { Field, TextInput, TextArea, Select, SubmitButton } from "@/components/Field";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";

// Edit everything about a video after upload — including flipping it
// between draft and published.
export default function EditVideoForm({
  video,
}: {
  video: {
    id: string;
    title: string;
    description: string;
    backstory: string;
    category: string;
    tags: string; // comma-separated for editing
    status: string;
    captionsVtt: string;
  };
}) {
  const { busy, error, run } = useAction();
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [backstory, setBackstory] = useState(video.backstory);
  const [category, setCategory] = useState(video.category);
  const [tags, setTags] = useState(video.tags);
  const [status, setStatus] = useState(video.status === "draft" ? "draft" : "published");
  const [captionsVtt, setCaptionsVtt] = useState(video.captionsVtt);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const data = await run(
      `/api/videos/${video.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, backstory, category, tags, status, captionsVtt }),
      },
      { refresh: true }
    );
    if (data) setSaved(true);
  }

  const pillClass = (selected: boolean) =>
    `min-h-12 flex-1 rounded-full border-2 font-bold ${
      selected ? "border-accent bg-accent text-white" : "border-line bg-surface"
    }`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Title">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />
      </Field>

      <Field label="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="One-line description" hint="optional">
        <TextInput
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />
      </Field>

      <Field label="The story behind it" hint="optional">
        <TextArea
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          maxLength={2000}
          rows={3}
        />
      </Field>

      <Field label="Tags" hint="optional, comma-separated">
        <TextInput value={tags} onChange={(e) => setTags(e.target.value)} maxLength={200} />
      </Field>

      <Field label="Captions" hint="WebVTT format, optional">
        <TextArea
          value={captionsVtt}
          onChange={(e) => setCaptionsVtt(e.target.value)}
          maxLength={20000}
          rows={4}
          className="font-mono text-[14px]"
        />
      </Field>

      <div className="flex flex-col gap-1 font-semibold">
        <span>Status</span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={status === "published"}
            onClick={() => setStatus("published")}
            className={pillClass(status === "published")}
          >
            Published
          </button>
          <button
            type="button"
            aria-pressed={status === "draft"}
            onClick={() => setStatus("draft")}
            className={pillClass(status === "draft")}
          >
            Draft
          </button>
        </div>
        <p className="text-[14px] font-normal text-ink-soft">
          Drafts are only visible to you.
        </p>
      </div>

      {error && <p className="font-semibold text-accent">{error}</p>}
      {saved && <p className="font-semibold text-good">Saved ✓</p>}

      <SubmitButton busy={busy}>Save changes</SubmitButton>
    </form>
  );
}
