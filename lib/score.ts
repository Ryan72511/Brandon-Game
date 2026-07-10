import {
  SCORE_PRIOR_MEAN,
  SCORE_PRIOR_WEIGHT_ALL_TIME,
  MIN_RATINGS_FOR_SCORE,
  FRESH_POP_THRESHOLD,
} from "@/lib/constants";

export interface RatingCounts {
  burnt: number;
  popped: number;
  butter: number;
}

export function totalRatings(c: RatingCounts): number {
  return c.burnt + c.popped + c.butter;
}

// "Fresh" = the viewer enjoyed it (popped or extra butter).
export function freshCount(c: RatingCounts): number {
  return c.popped + c.butter;
}

// Bayesian-smoothed % popped, 0-100. `priorWeight` pseudo-ratings at the
// prior mean keep tiny samples from producing 0s and 100s.
export function popcornScore(
  c: RatingCounts,
  priorWeight: number = SCORE_PRIOR_WEIGHT_ALL_TIME
): number {
  const total = totalRatings(c);
  const fresh = freshCount(c);
  return Math.round((100 * (fresh + priorWeight * SCORE_PRIOR_MEAN)) / (total + priorWeight));
}

export type ScoreDisplay =
  | { kind: "new"; count: number } // under threshold: "Just popped"
  | { kind: "scored"; score: number; count: number; fresh: boolean };

export function scoreDisplay(c: RatingCounts, cachedScore: number): ScoreDisplay {
  const count = totalRatings(c);
  if (count < MIN_RATINGS_FOR_SCORE) return { kind: "new", count };
  return {
    kind: "scored",
    score: cachedScore,
    count,
    fresh: cachedScore >= FRESH_POP_THRESHOLD,
  };
}
