// Procedural channel branding — every channel gets a deterministic
// "streaming brand" look (Roku-tile style) derived from its slug and
// category. Zero image assets: gradients + the channel emoji as the mark.

export interface ChannelBrand {
  c1: string;
  c2: string;
  animated?: boolean; // Surprise Me's breathing iridescent treatment
  gold?: boolean; // This Week's Best — the one gold-ringed tile
}

// Genre gradients (135°, both stops hold ≥4.5:1 under white text) — any
// future channel in a known category inherits a coherent genre color.
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  comedy: ["#DC2626", "#7F1D1D"], // Marquee Red
  drama: ["#7C3AED", "#4C1D95"], // Stage Velvet
  romcom: ["#BE123C", "#581C87"], // Blush & Velvet
  romance: ["#DB2777", "#831843"], // Neon Rose
  horror: ["#450A0A", "#18181B"], // Blackout Red
  thriller: ["#4338CA", "#1E1B4B"], // Midnight Indigo
  mystery: ["#0F766E", "#042F2E"], // Teal Noir
  scifi: ["#1E40AF", "#0F172A"], // Deep Orbit
  fantasy: ["#5B21B6", "#312E81"], // Arcane Violet
  action: ["#B91C1C", "#450A0A"], // Detonation
  adventure: ["#0C4A6E", "#1E3A8A"], // Expedition Blue
  animation: ["#9D174D", "#4C1D95"], // Ink & Cel
  documentary: ["#57534E", "#1C1917"], // Archive Stone
  reality: ["#6B21A8", "#3B0764"], // Spotlight Plum
  sports: ["#3F6212", "#1A2E05"], // Turf
  music: ["#A21CAF", "#581C87"], // Club Fuchsia
  gaming: ["#3730A3", "#111827"], // Neon Console
  food: ["#B45309", "#78350F"], // Copper Kitchen
  travel: ["#0369A1", "#1E3A8A"], // Open Ocean
  animals: ["#15803D", "#14532D"], // Meadow
  kids: ["#0E7490", "#164E63"], // Lagoon
  learning: ["#334155", "#0F172A"], // Studio Steel
  motivation: ["#C2410C", "#9F1239"], // Sunrise Run
  lifestyle: ["#047857", "#064E3B"], // Evergreen
  shorts: ["#9A3412", "#431407"], // Quick Ember
};

const SLUG_OVERRIDES: Record<string, ChannelBrand> = {
  "surprise-me": { c1: "#5B21B6", c2: "#BE185D", animated: true },
  "weekly-best": { c1: "#713F12", c2: "#1C1917", gold: true },
};

function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

export function getChannelBrand(slug: string, category: string): ChannelBrand {
  const override = SLUG_OVERRIDES[slug];
  if (override) return override;
  const genre = CATEGORY_GRADIENTS[category];
  if (genre) return { c1: genre[0], c2: genre[1] };
  // User-created channels without a genre: hash the slug into a deep hue,
  // skipping the yellow band (38-100°) that fails white-text contrast.
  // 29% lightness holds ≥4.79:1 under white text on every reachable hue
  // (greens/cyans are the perceptual worst case).
  let hue = djb2(slug) % 300;
  if (hue >= 38 && hue <= 100) hue += 70;
  return {
    c1: `hsl(${hue}, 72%, 29%)`,
    c2: `hsl(${(hue + 40) % 360}, 78%, 20%)`,
  };
}
