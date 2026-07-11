import { getChannelBrand } from "@/lib/channelBrand";
import { CATEGORY_LABELS, type Category } from "@/lib/constants";
import GenreIcon from "@/components/GenreIcon";

// The face of a channel's "streaming brand", Roku-tile style: genre gradient
// + glass highlight, an abstract ring-and-beam texture, a designed line-art
// genre mark, and the channel name as the wordmark. No emoji — unless the
// channel is a custom category the maker represents with their own emoji or
// an uploaded photo (which becomes the tile art).
export interface ChannelLogoProps {
  slug: string;
  category: string;
  name: string;
  emoji: string;
  customCategory?: string;
  coverUrl?: string;
  variant?: "tile" | "wide" | "avatar";
  className?: string;
}

function markKind(props: ChannelLogoProps): { photo: boolean; customEmoji: boolean } {
  // Genre channels and the special prebuilt slugs get designed marks;
  // custom-category channels use the maker's emoji (or photo).
  const isGenre =
    props.category in CATEGORY_LABELS ||
    props.slug === "surprise-me" ||
    props.slug === "weekly-best";
  const photo = Boolean(props.coverUrl);
  return { photo, customEmoji: !photo && !isGenre };
}

// Deterministic abstract texture: a large offset ring + a diagonal sheen.
function Texture({ slug }: { slug: string }) {
  const flip = slug.length % 2 === 0;
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute h-[140%] w-[70%] rounded-full border-[10px] border-white/[0.07] ${
          flip ? "-bottom-1/2 -right-1/4" : "-bottom-1/2 -left-1/4"
        }`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 55%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.05) 72%, transparent 72%)",
        }}
      />
    </>
  );
}

function Mark({
  props,
  iconSize,
  emojiClass,
}: {
  props: ChannelLogoProps;
  iconSize: number;
  emojiClass: string;
}) {
  const { customEmoji } = markKind(props);
  if (customEmoji) {
    return (
      <span aria-hidden className={emojiClass}>
        {props.emoji}
      </span>
    );
  }
  const genre = props.slug === "surprise-me" ? "surprise" : props.slug === "weekly-best" ? "weekly" : props.category;
  return (
    <GenreIcon
      genre={genre}
      size={iconSize}
      className="text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
    />
  );
}

export function categoryLabel(category: string, customCategory?: string): string {
  if (customCategory) return customCategory;
  return CATEGORY_LABELS[category as Category] ?? "";
}

export default function ChannelLogo(props: ChannelLogoProps) {
  const { slug, category, name, coverUrl, variant = "tile", className = "" } = props;
  const brand = getChannelBrand(slug, category);
  const { photo } = markKind(props);

  // Photo channels: the uploaded image IS the tile art, under a scrim that
  // keeps the wordmark readable.
  const surface: React.CSSProperties = photo
    ? {
        // Heavy bottom scrim: the wordmark must stay readable over any
        // photo, including near-white ones.
        backgroundImage: `linear-gradient(180deg, rgba(10,10,18,0.20) 0%, rgba(10,10,18,0.60) 45%, rgba(10,10,18,0.85) 100%), url(${JSON.stringify(coverUrl)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        // Highlight capped at 0.10 alpha so wordmark contrast stays ≥4.5:1
        // even where the glass sheen is brightest.
        backgroundImage: `radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, ${brand.c1} 0%, ${brand.c2} 100%)`,
      };

  if (variant === "avatar") {
    return (
      <span
        aria-hidden
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-inset ring-white/10 ${className}`}
        style={surface}
      >
        {!photo && <Texture slug={slug} />}
        {!photo && <Mark props={props} iconSize={26} emojiClass="relative text-2xl" />}
      </span>
    );
  }

  if (variant === "wide") {
    return (
      <span
        className={`relative flex aspect-[5/2] w-full items-center gap-4 overflow-hidden rounded-2xl px-5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-inset ${
          brand.gold ? "ring-gold/40" : "ring-white/10"
        } ${brand.animated && !photo ? "hero-iridescent" : ""} ${className}`}
        style={brand.animated && !photo ? undefined : surface}
      >
        {!photo && <Texture slug={slug} />}
        {!photo && (
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15">
            <Mark props={props} iconSize={34} emojiClass="text-[34px] leading-none" />
          </span>
        )}
        <span className="relative min-w-0 self-end pb-4">
          <span className="block text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
            {name}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`relative flex aspect-[16/10] w-full flex-col items-center justify-center overflow-hidden rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-inset ${
        brand.gold ? "ring-gold/40" : "ring-white/10"
      } ${brand.animated && !photo ? "hero-iridescent" : ""} ${className}`}
      style={brand.animated && !photo ? undefined : surface}
    >
      {!photo && <Texture slug={slug} />}
      {!photo && <Mark props={props} iconSize={30} emojiClass="relative text-[30px] leading-none" />}
      <span
        className={`relative line-clamp-2 text-center text-[17px] font-extrabold leading-[1.15] tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] ${
          photo ? "mt-auto" : "mt-2"
        }`}
      >
        {name}
      </span>
    </span>
  );
}
