"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Play all / Follow / Share row on a channel page.
export default function ChannelActions({
  channelId,
  slug,
  name,
  firstVideoId,
  following: initialFollowing,
  signedIn,
  isOwner,
}: {
  channelId: string;
  slug: string;
  name: string;
  firstVideoId: string | null;
  following: boolean;
  signedIn: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [copied, setCopied] = useState(false);

  async function toggleFollow() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/channel/${slug}`)}`);
      return;
    }
    const res = await fetch(`/api/channels/${channelId}/follow`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
      router.refresh();
    }
  }

  async function share() {
    const url = `${window.location.origin}/channel/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on Reely`, url });
        return;
      }
    } catch {
      return; // user cancelled the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // No clipboard (e.g. non-HTTPS): show the link for manual copying.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex gap-2">
      {firstVideoId && (
        <button
          onClick={() => router.push(`/watch/${firstVideoId}?ch=${slug}`)}
          className="min-h-14 flex-1 rounded-xl bg-accent font-bold text-white"
        >
          ▶ Play all
        </button>
      )}
      {!isOwner && (
        <button
          onClick={toggleFollow}
          aria-pressed={following}
          className={`min-h-14 flex-1 rounded-xl border-2 font-bold ${
            following ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"
          }`}
        >
          {following ? "Following ✓" : "Follow"}
        </button>
      )}
      <button
        onClick={share}
        className="min-h-14 flex-1 rounded-xl border-2 border-line bg-surface font-bold"
      >
        {copied ? "Link copied!" : "↗ Share"}
      </button>
    </div>
  );
}
