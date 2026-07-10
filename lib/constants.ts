export const APP_NAME = "Reely";
export const APP_TAGLINE = "Tiny shows. Big feelings.";

// Content categories — the fixed vocabulary for videos and channels.
export const CATEGORIES = [
  "comedy",
  "drama",
  "motivation",
  "mystery",
  "romance",
  "thriller",
  "food",
  "animals",
  "learning",
  "travel",
  "music",
  "kids",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  comedy: "Comedy",
  drama: "Drama",
  motivation: "Motivation",
  mystery: "Mystery",
  romance: "Romance",
  thriller: "Thriller",
  food: "Food & Making",
  animals: "Animals",
  learning: "Learning",
  travel: "Travel",
  music: "Music",
  kids: "Kids",
};

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

export const SESSION_COOKIE = "reely_session";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_VIDEO_SECONDS = 5 * 60; // keep it short — this is Reely
