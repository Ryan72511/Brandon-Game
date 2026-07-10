"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom navigation. Watching mode: Watch / Channels / Charts / You.
// Creating mode: Studio / Add Video / You. Icons always have text labels.
const WATCHING_TABS = [
  { href: "/", label: "Watch", icon: "▶" },
  { href: "/channels", label: "Channels", icon: "📺" },
  { href: "/charts", label: "Charts", icon: "🏆" },
  { href: "/you", label: "You", icon: "🙂" },
];

const CREATING_TABS = [
  { href: "/studio", label: "Studio", icon: "🎬" },
  { href: "/studio/upload", label: "Add video", icon: "＋" },
  { href: "/you", label: "You", icon: "🙂" },
];

export default function TabBar({
  mode,
  signedIn,
}: {
  mode: string;
  signedIn: boolean;
  username: string | null;
}) {
  const pathname = usePathname();
  // The watch feed is immersive; the tab bar stays so people never get lost.
  const tabs = signedIn && mode === "creating" ? CREATING_TABS : WATCHING_TABS;
  // The channel storefront routes run dark — the bar follows.
  const dark = pathname.startsWith("/channels") || pathname.startsWith("/channel/");

  return (
    <nav
      aria-label="Main"
      className={`fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur ${
        dark ? "border-white/10 bg-[#0f1122]/95" : "border-line bg-surface/95"
      }`}
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
                active
                  ? dark
                    ? "text-white"
                    : "text-accent"
                  : dark
                    ? "text-[#8e94ab]"
                    : "text-ink-soft"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
