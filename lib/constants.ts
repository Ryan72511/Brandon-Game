export const APP_NAME = "Gasp";
export const APP_TAGLINE = "Made you gasp.";

// Genre taxonomy — the full base of categories for videos and channels.
// People can also create their OWN category on a channel (category="custom"
// + a label they name, represented by an emoji or an uploaded photo).
export const CATEGORIES = [
  "comedy",
  "drama",
  "romcom",
  "romance",
  "horror",
  "thriller",
  "mystery",
  "scifi",
  "fantasy",
  "action",
  "adventure",
  "animation",
  "documentary",
  "reality",
  "sports",
  "music",
  "gaming",
  "food",
  "travel",
  "animals",
  "kids",
  "learning",
  "motivation",
  "lifestyle",
  "shorts",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  comedy: "Comedy",
  drama: "Drama",
  romcom: "Rom-Com",
  romance: "Romance",
  horror: "Horror",
  thriller: "Thriller",
  mystery: "Mystery",
  scifi: "Sci-Fi",
  fantasy: "Fantasy",
  action: "Action",
  adventure: "Adventure",
  animation: "Animation",
  documentary: "Documentary",
  reality: "Reality",
  sports: "Sports",
  music: "Music",
  gaming: "Gaming",
  food: "Food & Cooking",
  travel: "Travel",
  animals: "Animals",
  kids: "Kids",
  learning: "Learning",
  motivation: "Motivation",
  lifestyle: "Lifestyle",
  shorts: "Shorts",
};

// The sentinel category for make-your-own; the label lives on the channel.
export const CUSTOM_CATEGORY = "custom";

// The Spectrum — Gasp's category color system. Ten hues at matched vibrance so
// no genre shouts over another. Chips use the hue at low-opacity fill + full
// hue text; browse dots use the solid hue. The hues are the fixed asset; the
// genre→hue mapping below is the default and can be re-tuned freely.
export const SPECTRUM = {
  romance: "#FF5E9C",
  billionaire: "#F2B63C",
  revenge: "#FF7A45",
  comedy: "#A8E34D",
  fantasy: "#35D0A5",
  scifi: "#3EC6E0",
  thriller: "#4D7CFF",
  horror: "#8A5CFF",
  kdrama: "#C95CE8",
  truecrime: "#7E8AA6",
} as const;

// Every app category maps to one Spectrum hue (collisions are fine — 10 hues,
// more genres). Custom categories fall back to Orchid.
const CATEGORY_HUE: Record<string, string> = {
  comedy: SPECTRUM.comedy,
  drama: SPECTRUM.kdrama,
  romcom: SPECTRUM.romance,
  romance: SPECTRUM.romance,
  horror: SPECTRUM.horror,
  thriller: SPECTRUM.thriller,
  mystery: SPECTRUM.truecrime,
  scifi: SPECTRUM.scifi,
  fantasy: SPECTRUM.fantasy,
  action: SPECTRUM.revenge,
  adventure: SPECTRUM.scifi,
  animation: SPECTRUM.fantasy,
  documentary: SPECTRUM.truecrime,
  reality: SPECTRUM.kdrama,
  sports: SPECTRUM.comedy,
  music: SPECTRUM.kdrama,
  gaming: SPECTRUM.thriller,
  food: SPECTRUM.billionaire,
  travel: SPECTRUM.scifi,
  animals: SPECTRUM.fantasy,
  kids: SPECTRUM.comedy,
  learning: SPECTRUM.truecrime,
  motivation: SPECTRUM.revenge,
  lifestyle: SPECTRUM.romance,
  shorts: SPECTRUM.billionaire,
};

export function categoryHue(category: string): string {
  return CATEGORY_HUE[category] ?? "#C043FF"; // Orchid for custom/unknown
}

// Rating vocabulary — the Popcorn system.
export const RATING_VALUES = ["burnt", "popped", "butter"] as const;
export type RatingValue = (typeof RATING_VALUES)[number];

export const RATING_META: Record<
  RatingValue,
  { emoji: string; label: string; sub: string }
> = {
  burnt: { emoji: "🔥", label: "Burnt", sub: "Not for me" },
  popped: { emoji: "🍿", label: "Popped", sub: "Liked it" },
  butter: { emoji: "🧈", label: "Extra Butter", sub: "Loved it!" },
};

// Bayesian smoothing: score = 100 * (fresh + m*PRIOR) / (total + m).
// A video with one "butter" vote can't hit 100 or top a chart.
export const SCORE_PRIOR_MEAN = 0.5;
export const SCORE_PRIOR_WEIGHT_ALL_TIME = 5;
export const SCORE_PRIOR_WEIGHT_WEEKLY = 3;
// Below this many ratings we show "Just popped" instead of a number.
export const MIN_RATINGS_FOR_SCORE = 5;
// Gold badge threshold, Rotten-Tomatoes style.
export const FRESH_POP_THRESHOLD = 75;

export const MODE_WATCHING = "watching";
export const MODE_CREATING = "creating";

export const AVATAR_EMOJI = [
  "🙂", "😎", "🦊", "🐼", "🦄", "🐸", "🐙", "🦉", "🐯", "🌟", "🎬", "🍿",
];
export const AVATAR_COLORS = [
  "#FFD166", "#F4A26B", "#8ECAE6", "#A8DADC", "#CDB4DB", "#B7E4C7",
  "#FFC8DD", "#BDE0FE", "#E9C46A", "#94D2BD",
];

export const SESSION_COOKIE = "gasp_session";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_VIDEO_SECONDS = 5 * 60; // keep it short — Gasp is microdrama
