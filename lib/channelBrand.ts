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
  mystery: ["#0F766E", "#042F2E"], // Teal Noir
  romance: ["#DB2777", "#831843"], // Neon Rose
  thriller: ["#4338CA", "#1E1B4B"], // Midnight Indigo
  food: ["#B45309", "#78350F"], // Copper Kitchen
  animals: ["#15803D", "#14532D"], // Meadow
  learning: ["#334155", "#0F172A"], // Studio Steel
  travel: ["#0369A1", "#1E3A8A"], // Open Ocean
  music: ["#A21CAF", "#581C87"], // Club Fuchsia
  kids: ["#0E7490", "#164E63"], // Lagoon
  motivation: ["#C2410C", "#9F1239"], // Sunrise Run
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
  // skipping the yellow band (40-100°) that fails white-text contrast.
  // Lightness stays low (30%/20%) so even green/cyan hues hold ≥4.5:1
  // under white text with the glass highlight on top.
  let hue = djb2(slug) % 300;
  if (hue >= 40 && hue <= 100) hue += 70;
  return {
    c1: `hsl(${hue}, 72%, 30%)`,
    c2: `hsl(${(hue + 40) % 360}, 78%, 20%)`,
  };
}
