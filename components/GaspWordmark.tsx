"use client";

import { useId } from "react";

// The Gasp wordmark. Every letter hides a twist — a stroke that crosses where
// it shouldn't. The G's bar threads under its own rising tail; the a's crossbar
// weaves over one leg and under the other. Only the a is hot (Afterglow); the
// G, s and p carry Foam. Solid ink for 1-color light/print. IDs namespaced per
// instance. Height-driven so it scales crisply anywhere.
export default function GaspWordmark({
  height = 44,
  tone = "brand",
  className = "",
}: {
  height?: number;
  tone?: "brand" | "ink";
  className?: string;
}) {
  const uid = useId();
  const hg = `gw-hg-${uid}`;
  const hlw = `gw-hlw-${uid}`;
  const hbw = `gw-hbw-${uid}`;
  const foam = tone === "ink" ? "#0B0B10" : "#F5F4F7";
  const hot = tone === "ink" ? "#0B0B10" : `url(#${hg})`;
  // viewBox 376 wide / 140 tall → keep aspect ratio from the height.
  const width = Math.round((height * 376) / 140);
  return (
    <svg
      viewBox="-20 -20 376 140"
      width={width}
      height={height}
      role="img"
      aria-label="Gasp"
      className={className}
    >
      <defs>
        <linearGradient id={hg} gradientUnits="userSpaceOnUse" x1="98" y1="0" x2="162" y2="100">
          <stop offset="0" stopColor="#C043FF" />
          <stop offset="1" stopColor="#FF5C38" />
        </linearGradient>
        <mask id={hlw}>
          <rect x="-20" y="-20" width="376" height="140" fill="white" />
          <path d="M104 58 L132 58" fill="none" stroke="black" strokeWidth="30" strokeLinecap="round" />
        </mask>
        <mask id={hbw}>
          <rect x="-20" y="-20" width="376" height="140" fill="white" />
          <path d="M143 40 L154 74" fill="none" stroke="black" strokeWidth="30" strokeLinecap="round" />
        </mask>
      </defs>
      <g fill="none" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
        <path d="M55 9 A32 32 0 0 0 0 32 L0 68 A32 32 0 0 0 64 68 L64 58 L38 58" stroke={foam} />
        <path d="M98 100 L130 0 L162 100" stroke={hot} mask={`url(#${hlw})`} />
        <path d="M104 58 L156 58" stroke={hot} mask={`url(#${hbw})`} />
        <path
          d="M255 13 C247 2, 228 -2, 216 4 C203 10, 199 25, 208 34 C214 41, 224 45, 232 49 C244 55, 257 60, 257 74 C257 90, 242 101, 226 98 C216 96, 208 91, 205 83"
          stroke={foam}
        />
        <path d="M294 100 L294 0 L316 0 A26 26 0 0 1 316 52 L294 52" stroke={foam} />
      </g>
    </svg>
  );
}
