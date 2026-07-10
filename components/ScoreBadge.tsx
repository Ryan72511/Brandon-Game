import type { ScoreDisplay } from "@/lib/score";

// The Popcorn Score, shown the same way everywhere. Under 5 ratings we never
// show a number — "Just popped" invites the first raters instead.
export default function ScoreBadge({
  score,
  size = "md",
}: {
  score: ScoreDisplay;
  size?: "sm" | "md";
}) {
  const base =
    size === "sm"
      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-bold"
      : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[15px] font-bold";

  if (score.kind === "new") {
    return (
      <span className={`${base} bg-line/60 text-ink-soft`} title="Not enough ratings yet">
        🍿 Just popped
      </span>
    );
  }
  return (
    <span
      className={`${base} ${score.fresh ? "bg-gold-soft text-ink" : "bg-line/60 text-ink-soft"}`}
      title={`${score.count} ratings`}
    >
      {score.fresh ? "🍿" : "🌽"} {score.score}% popped
    </span>
  );
}
