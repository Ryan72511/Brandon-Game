"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_EMOJI, AVATAR_COLORS } from "@/lib/constants";
import Avatar from "@/components/Avatar";

// Edit the things everyone has — face, color, name, bio — without needing to
// enter creator mode. Creators get the longer story fields in their studio.
export default function EditProfileForm({
  initial,
}: {
  initial: { displayName: string; bio: string; avatarEmoji: string; avatarColor: string };
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarEmoji, setAvatarEmoji] = useState(initial.avatarEmoji);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
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
      body: JSON.stringify({ displayName, bio, avatarEmoji, avatarColor }),
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
      <div className="flex items-center justify-center py-2">
        <Avatar emoji={avatarEmoji} color={avatarColor} size={88} />
      </div>

      <fieldset>
        <legend className="mb-1 font-semibold">Your face</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setAvatarEmoji(e)}
              aria-pressed={avatarEmoji === e}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl ${
                avatarEmoji === e ? "border-accent bg-accent-soft" : "border-line bg-surface"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold">Your color</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAvatarColor(c)}
              aria-pressed={avatarColor === c}
              aria-label={`Color ${c}`}
              className={`h-12 w-12 rounded-full border-4 ${
                avatarColor === c ? "border-accent" : "border-line"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 font-semibold">
        Your name <span className="font-normal text-ink-soft">(what people see)</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          required
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        Short bio <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One friendly line"
          maxLength={200}
          className="min-h-14 rounded-xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
        />
      </label>

      {error && <p className="font-semibold text-error">{error}</p>}
      {saved && <p className="font-semibold text-good">Saved! ✓</p>}

      <button
        type="submit"
        disabled={busy}
        className="min-h-14 rounded-xl bg-accent text-lg font-bold text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
