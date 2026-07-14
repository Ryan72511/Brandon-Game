import type { ScoreDisplay } from "@/lib/score";
import { BUTTER_POP_THRESHOLD, UNPOPPED_THRESHOLD } from "@/lib/constants";

// The Popcorn Score, shown the same way everywhere. Three tiers so the emoji,
// word, and number never contradict each other:
//   🧈 94% buttery   (>= 90% popped — elite)
//   🍿 72% popped    (50–89% — most people popped it)
//   🌽 62% unpopped  (< 50% — most people didn't; we show the unpopped share)
// Under 5 ratings we show no number — "Just popped" invites the first raters.
export default function ScoreBadge({
  score,
  size = "md",
  dark = false,
}: {
  score: ScoreDisplay;
  size?: "sm" | "md";
  dark?: boolean;
}) {
  const base =
    size === "sm"
      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-bold"
      : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] font-bold";
  const muted = dark ? "bg-white/15 text-white" : "bg-line/60 text-ink-soft";

  if (score.kind === "new") {
    return (
      <span className={`${base} ${muted}`} title="Not enough ratings yet">
        🍿 Just popped
      </span>
    );
  }

  const s = score.score;
  let emoji: string;
  let word: string;
  let num: number;
  let tone: string;
  if (s >= BUTTER_POP_THRESHOLD) {
    emoji = "🧈";
    word = "buttery";
    num = s;
    tone = "bg-gold text-[#1c1917]"; // richest tier, bright butter
  } else if (s >= UNPOPPED_THRESHOLD) {
    emoji = "🍿";
    word = "popped";
    num = s;
    tone = "bg-gold-soft text-ink";
  } else {
    emoji = "🌽";
    word = "unpopped";
    num = 100 - s; // most people didn't pop it — show the unpopped share
    tone = muted;
  }

  return (
    <span className={`${base} ${tone}`} title={`${score.count} ratings`}>
      {emoji} {num}% {word}
    </span>
  );
}
