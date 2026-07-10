"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import type { MyChannel } from "./types";

// Save a video into one of your channels — or make a new channel right here.
export default function SaveSheet({
  channels,
  savedIn,
  onToggle,
  onCreateChannel,
  onClose,
}: {
  channels: MyChannel[];
  savedIn: string[];
  onToggle: (channelId: string, save: boolean) => void;
  onCreateChannel: (name: string) => Promise<MyChannel | null>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError("");
    const channel = await onCreateChannel(newName.trim());
    setCreating(false);
    if (channel) {
      setNewName("");
      onToggle(channel.id, true);
    } else {
      setError("Couldn't make that channel. Try again.");
    }
  }

  return (
    <Sheet title="Save to a channel" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {channels.map((ch) => {
          const saved = savedIn.includes(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => onToggle(ch.id, !saved)}
              aria-pressed={saved}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left ${
                saved ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-bg"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {ch.emoji}
              </span>
              <span className="flex-1 font-semibold">{ch.name}</span>
              <span className={`font-bold ${saved ? "text-accent" : "text-ink-soft"}`}>
                {saved ? "Saved ✓" : "Save"}
              </span>
            </button>
          );
        })}
        <form onSubmit={handleCreate} className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New channel name…"
            aria-label="New channel name"
            maxLength={40}
            className="min-h-14 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="min-h-14 rounded-2xl bg-accent px-5 font-bold text-white disabled:opacity-40"
          >
            {creating ? "…" : "Create"}
          </button>
        </form>
        {error && <p className="text-[15px] font-semibold text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}
