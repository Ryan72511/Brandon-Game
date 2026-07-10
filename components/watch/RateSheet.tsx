"use client";

import Sheet from "./Sheet";
import { RATING_VALUES, RATING_META, type RatingValue } from "@/lib/constants";

// The Popcorn rating: three big buttons, one tap, done.
export default function RateSheet({
  current,
  onRate,
  onClose,
}: {
  current: string | null;
  onRate: (value: RatingValue) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="How was it?" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {RATING_VALUES.map((value) => {
          const meta = RATING_META[value];
          const selected = current === value;
          return (
            <button
              key={value}
              onClick={() => onRate(value)}
              aria-pressed={selected}
              className={`flex min-h-16 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:bg-bg"
              }`}
            >
              <span className={`text-4xl ${selected ? "pop-burst" : ""}`} aria-hidden>
                {meta.emoji}
              </span>
              <span>
                <span className="block text-lg font-bold">{meta.label}</span>
                <span className="block text-[15px] text-ink-soft">{meta.sub}</span>
              </span>
              {selected && (
                <span className="ml-auto font-bold text-accent" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
        <p className="text-center text-[14px] text-ink-soft">
          Ratings make the Popcorn Score — like a friendly Rotten Tomatoes.
        </p>
      </div>
    </Sheet>
  );
}
