"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sheet from "@/components/watch/Sheet";
import GenreIcon from "@/components/GenreIcon";
import { CATEGORIES, CATEGORY_LABELS, CUSTOM_CATEGORY } from "@/lib/constants";

const EMOJI_CHOICES = ["📺", "🌈", "🔥", "🌙", "🫶", "🪩", "🌊", "🍕", "🚀", "🧠", "🐣", "✨"];

// Create a channel: pick a genre (it becomes "<Your name>'s Comedy Channel")
// or make your own category, represented by an emoji or an uploaded photo.
export default function NewChannelButton({
  variant = "pill",
  displayName = "",
}: {
  // "tile" renders as a dashed storefront cell on the dark channels page.
  variant?: "pill" | "tile";
  displayName?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customLook, setCustomLook] = useState<"emoji" | "photo">("emoji");
  const [emoji, setEmoji] = useState("📺");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isCustom = category === CUSTOM_CATEGORY;

  // "Sunny Dan's Comedy Channel" — suggested automatically, editable freely.
  function suggestName(cat: string, custom: string) {
    if (nameTouched && name.trim()) return;
    const label =
      cat === CUSTOM_CATEGORY
        ? custom.trim()
        : (CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? "");
    if (!label) return;
    const owner = displayName.trim() || "My";
    const possessive = owner.toLowerCase().endsWith("s") ? `${owner}'` : `${owner}'s`;
    // Fit inside 40 chars without cutting mid-word: drop " Channel", then
    // fall back to just the label.
    const candidates = [`${possessive} ${label} Channel`, `${possessive} ${label}`, label];
    setName(candidates.find((c) => c.length <= 40) ?? label.slice(0, 40));
  }

  function pickCover(f: File | null) {
    setCover(f);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(f ? URL.createObjectURL(f) : "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    if (!category) {
      setError("Pick a category first.");
      return;
    }
    if (isCustom && !customCategory.trim()) {
      setError("Name your category — it can be anything.");
      return;
    }
    if (isCustom && customLook === "photo" && !cover) {
      setError("Pick a photo — or switch to an emoji instead.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("name", name.trim());
    form.set("description", description);
    form.set("category", category);
    if (isCustom) {
      form.set("customCategory", customCategory.trim());
      if (customLook === "photo" && cover) form.set("cover", cover);
      else form.set("emoji", emoji);
    }
    const res = await fetch("/api/channels", { method: "POST", body: form });
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
            <fieldset>
              <legend className="mb-2 font-semibold">What kind of channel?</legend>
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategory(CUSTOM_CATEGORY);
                    suggestName(CUSTOM_CATEGORY, customCategory);
                  }}
                  aria-pressed={isCustom}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed px-1 text-[13px] font-semibold ${
                    isCustom ? "border-accent bg-accent-soft" : "border-line bg-surface"
                  }`}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ＋
                  </span>
                  My own
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      suggestName(c, customCategory);
                    }}
                    aria-pressed={category === c}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-[13px] font-semibold ${
                      category === c ? "border-accent bg-accent-soft" : "border-line bg-surface"
                    }`}
                  >
                    <GenreIcon genre={c} size={20} className="text-ink" />
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </fieldset>

            {isCustom && (
              <div className="flex flex-col gap-3 rounded-xl bg-bg p-3">
                <label className="flex flex-col gap-1 font-semibold">
                  Name your category
                  <input
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      suggestName(CUSTOM_CATEGORY, e.target.value);
                    }}
                    placeholder="Like “Cozy Vibes” or “Trick Shots”"
                    maxLength={30}
                    className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={customLook === "emoji"}
                    onClick={() => setCustomLook("emoji")}
                    className={`min-h-12 flex-1 rounded-full font-bold ${
                      customLook === "emoji" ? "bg-accent text-white" : "border-2 border-line bg-surface"
                    }`}
                  >
                    Pick an emoji
                  </button>
                  <button
                    type="button"
                    aria-pressed={customLook === "photo"}
                    onClick={() => setCustomLook("photo")}
                    className={`min-h-12 flex-1 rounded-full font-bold ${
                      customLook === "photo" ? "bg-accent text-white" : "border-2 border-line bg-surface"
                    }`}
                  >
                    Upload a photo
                  </button>
                </div>
                {customLook === "emoji" ? (
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
                ) : (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface font-semibold text-ink-soft"
                    >
                      {coverPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverPreview}
                          alt="Your category photo"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        "Tap to choose a photo — it becomes your channel art"
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            <label className="flex flex-col gap-1 font-semibold">
              Channel name
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameTouched(true);
                }}
                placeholder="Pick a category and we’ll suggest one"
                maxLength={40}
                required
                className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
              />
            </label>

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
