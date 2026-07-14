"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Follow / unfollow toggle for creators and series (and anything with a
// POST endpoint returning { following }). Positive by default — the emphasis
// of the app is on celebrating and following, not on the negative actions.
export default function FollowButton({
  endpoint,
  initialFollowing,
  signedIn,
  size = "md",
  className = "",
}: {
  endpoint: string;
  initialFollowing: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const res = await fetch(endpoint, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setFollowing(Boolean(data.following));
      router.refresh();
    }
  }

  const sizing = size === "sm" ? "min-h-9 px-4 text-[14px]" : "min-h-12 px-6 text-[15px]";
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={`${sizing} rounded-full font-bold disabled:opacity-50 ${
        following ? "border-2 border-line bg-surface text-ink" : "bg-accent text-white"
      } ${className}`}
    >
      {following ? "Following ✓" : "Follow"}
    </button>
  );
}
