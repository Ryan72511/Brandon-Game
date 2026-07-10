import Link from "next/link";
import ChannelLogo from "@/components/ChannelLogo";

// One storefront cell: the brand tile plus a quiet caption underneath.
// The whole cell is a single large Link target.
export default function ChannelTile({
  slug,
  name,
  emoji,
  category,
  caption,
  href,
  onLight = false,
}: {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  caption?: string;
  href?: string;
  // Set when the tile sits on a light page (e.g. creator profiles) so the
  // caption keeps readable contrast.
  onLight?: boolean;
}) {
  return (
    <Link
      href={href ?? `/channel/${slug}`}
      className="group block transition duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
    >
      <ChannelLogo slug={slug} category={category} name={name} emoji={emoji} variant="tile" />
      {caption && (
        <span
          className={`mt-1.5 block text-center text-[13px] font-medium ${
            onLight ? "text-ink-soft" : "text-night-meta"
          }`}
        >
          {caption}
        </span>
      )}
    </Link>
  );
}
