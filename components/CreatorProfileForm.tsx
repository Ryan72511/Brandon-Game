"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorProfileForm({
  initial,
  username,
}: {
  initial: {
    displayName: string;
    bio: string;
    creatorAbout: string;
    creatorProcess: string;
    creatorTools: string[];
  };
  username: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [creatorAbout, setCreatorAbout] = useState(initial.creatorAbout);
  const [creatorProcess, setCreatorProcess] = useState(initial.creatorProcess);
  const [toolsText, setToolsText] = useState(initial.creatorTools.join(", "));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        creatorAbout,
        creatorProcess,
        creatorTools: toolsText.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError("Couldn't save. Try again.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-semibold">
        Your name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          required
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Short bio
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One friendly line"
          maxLength={200}
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        About you as a creator
        <textarea
          value={creatorAbout}
          onChange={(e) => setCreatorAbout(e.target.value)}
          placeholder="Your story — why you make these"
          maxLength={2000}
          rows={4}
          className="rounded-xl border-2 border-line bg-surface p-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Tools & equipment <span className="font-normal text-ink-soft">(comma-separated)</span>
        <input
          value={toolsText}
          onChange={(e) => setToolsText(e.target.value)}
          placeholder="iPhone 15, CapCut, ring light"
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        Your process
        <textarea
          value={creatorProcess}
          onChange={(e) => setCreatorProcess(e.target.value)}
          placeholder="How an episode goes from idea to upload"
          maxLength={2000}
          rows={4}
          className="rounded-xl border-2 border-line bg-surface p-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      {error && <p className="font-semibold text-accent">{error}</p>}
      {saved && <p className="font-semibold text-good">Saved! ✓</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="min-h-14 flex-1 rounded-xl bg-accent font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/creator/${username}`)}
          className="min-h-14 flex-1 rounded-xl border-2 border-line bg-surface font-bold"
        >
          See your page
        </button>
      </div>
    </form>
  );
}
