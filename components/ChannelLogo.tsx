import { getChannelBrand } from "@/lib/channelBrand";

// The face of a channel's "streaming brand": genre gradient + glass
// highlight, a ghosted emoji watermark for texture, the emoji as the mark,
// and the channel name as the wordmark — the logo IS the name, Roku-style.
export default function ChannelLogo({
  slug,
  category,
  name,
  emoji,
  variant = "tile",
  className = "",
}: {
  slug: string;
  category: string;
  name: string;
  emoji: string;
  variant?: "tile" | "wide" | "avatar";
  className?: string;
}) {
  const brand = getChannelBrand(slug, category);
  const surface: React.CSSProperties = {
    // Highlight capped at 0.10 alpha so wordmark contrast stays ≥4.5:1
    // even where the glass sheen is brightest.
    backgroundImage: `radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(135deg, ${brand.c1} 0%, ${brand.c2} 100%)`,
  };

  const ghost = (size: number) => (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-3 -right-2 -rotate-12 opacity-[0.13]"
      style={{ fontSize: size, filter: "grayscale(1) brightness(1.6)", lineHeight: 1 }}
    >
      {emoji}
    </span>
  );

  if (variant === "avatar") {
    return (
      <span
        aria-hidden
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-inset ring-white/10 ${className}`}
        style={surface}
      >
        {ghost(52)}
        <span className="relative text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{emoji}</span>
      </span>
    );
  }

  if (variant === "wide") {
    return (
      <span
        className={`relative flex aspect-[5/2] w-full items-center gap-4 overflow-hidden rounded-2xl px-5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-inset ${
          brand.gold ? "ring-gold/40" : "ring-white/10"
        } ${brand.animated ? "hero-iridescent" : ""} ${className}`}
        style={brand.animated ? undefined : surface}
      >
        {ghost(120)}
        <span aria-hidden className="relative text-[52px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          {emoji}
        </span>
        <span className="relative min-w-0">
          <span className="block text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
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
      } ${brand.animated ? "hero-iridescent" : ""} ${className}`}
      style={brand.animated ? undefined : surface}
    >
      {ghost(110)}
      <span aria-hidden className="relative text-[38px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
        {emoji}
      </span>
      <span className="relative mt-1.5 line-clamp-2 text-center text-[17px] font-extrabold leading-[1.15] tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        {name}
      </span>
    </span>
  );
}
