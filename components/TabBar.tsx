"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Line-art tab icons matching the channel-tile mark system (no emoji).
const TAB_ICONS: Record<string, React.ReactNode> = {
  watch: <path d="m8 6 10 6-10 6V6Z" />,
  channels: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
      <path d="m8.5 2.5 3.5 4 3.5-4" />
    </>
  ),
  charts: (
    <>
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 15v3M8.5 21h7" />
    </>
  ),
  you: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  studio: (
    <>
      <path d="m4 8 16-4 1 4L5 12l-1-4ZM5 12h14v8H5v-8Z" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
};

function TabIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TAB_ICONS[name]}
    </svg>
  );
}

// Bottom navigation. Watching mode: Watch / Channels / Charts / You.
// Creating mode: Studio / Add Video / You. Icons always have text labels.
const WATCHING_TABS = [
  { href: "/", label: "Watch", icon: "watch" },
  { href: "/channels", label: "Channels", icon: "channels" },
  { href: "/charts", label: "Charts", icon: "charts" },
  { href: "/you", label: "You", icon: "you" },
];

const CREATING_TABS = [
  { href: "/studio", label: "Studio", icon: "studio" },
  { href: "/studio/upload", label: "Add video", icon: "add" },
  { href: "/you", label: "You", icon: "you" },
];

export default function TabBar({
  mode,
  signedIn,
  unreadCount = 0,
}: {
  mode: string;
  signedIn: boolean;
  username: string | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  // The watch feed is immersive; the tab bar stays so people never get lost.
  const tabs = signedIn && mode === "creating" ? CREATING_TABS : WATCHING_TABS;

  // The root layout doesn't re-render on client navigation, so the badge
  // refreshes itself as you move around (SSR count is the seed).
  const [unread, setUnread] = useState(unreadCount);
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/notifications?count=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.unread === "number") setUnread(data.unread);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, signedIn]);

  // Gasp is dark-first everywhere, so the bar is always the Panel treatment:
  // Orchid for the active tab, Dim for the rest.
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
    >
      <div className="mx-auto flex h-16 w-full max-w-lg items-stretch">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/" || pathname.startsWith("/watch")
              : pathname === tab.href ||
                (tab.href !== "/studio" && pathname.startsWith(tab.href + "/")) ||
                (tab.href === "/studio" && pathname === "/studio");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold ${
                active ? "text-accent" : "text-ink-soft"
              }`}
            >
              <span className="relative">
                <TabIcon name={tab.icon} />
                {tab.href === "/you" && unread > 0 && (
                  <span
                    aria-label={`${unread} unread notifications`}
                    className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-flare ring-2 ring-surface"
                  />
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
