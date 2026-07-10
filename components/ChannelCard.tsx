import Link from "next/link";

export default function ChannelCard({
  slug,
  name,
  emoji,
  description,
  videoCount,
  badge,
}: {
  slug: string;
  name: string;
  emoji: string;
  description?: string;
  videoCount?: number;
  badge?: string;
}) {
  return (
    <Link
      href={`/channel/${slug}`}
      className="flex min-h-20 items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-card"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-bg text-3xl" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-lg font-bold">{name}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[12px] font-bold">
              {badge}
            </span>
          )}
        </span>
        {description && (
          <span className="line-clamp-1 block text-[15px] text-ink-soft">{description}</span>
        )}
        {typeof videoCount === "number" && (
          <span className="block text-[14px] text-ink-soft">
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </span>
        )}
      </span>
      <span aria-hidden className="text-ink-soft">
        ›
      </span>
    </Link>
  );
}
