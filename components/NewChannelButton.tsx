"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "@/components/watch/Sheet";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";

const EMOJI_CHOICES = ["📺", "😂", "🎭", "💪", "🕵️", "❤️", "😱", "🍳", "🐾", "🎵", "🌍", "⭐"];

export default function NewChannelButton({
  variant = "pill",
}: {
  // "tile" renders as a dashed storefront cell on the dark channels page.
  variant?: "pill" | "tile";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📺");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), emoji, description, category }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setOpen(false);
      router.push(`/channel/${data.channel.slug}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create the channel. Try again.");
    }
  }

  return (
    <>
      {variant === "tile" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/25 bg-white/[0.04] transition hover:bg-white/[0.08] active:scale-[0.97]"
        >
          <span aria-hidden className="text-[28px] leading-none text-white/90">
            ＋
          </span>
          <span className="text-[15px] font-semibold text-white/90">New channel</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="min-h-12 rounded-full bg-accent px-5 font-bold text-white"
        >
          ＋ New channel
        </button>
      )}
      {open && (
        <Sheet title="New channel" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 font-semibold">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Like “Funny animal shows”"
                maxLength={40}
                required
                className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
              />
            </label>
            <fieldset>
              <legend className="mb-1 font-semibold">Pick an emoji</legend>
              <div className="flex flex-wrap gap-2">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={emoji === e}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl ${
                      emoji === e ? "border-accent bg-accent-soft" : "border-line bg-surface"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 font-semibold">
              What goes in it? <span className="font-normal text-ink-soft">(optional)</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One friendly sentence"
                maxLength={200}
                className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 font-semibold">
              Main category <span className="font-normal text-ink-soft">(optional)</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
              >
                <option value="">A bit of everything</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="font-semibold text-accent">{error}</p>}
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="min-h-14 rounded-xl bg-accent font-bold text-white disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create channel"}
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
}
