"use client";

import { useId } from "react";

// The Gasp mark: the woven G. Its tail rises past the crossbar and passes in
// front; the bar takes a knockout gap on each side of the crossing and
// overshoots beyond the body — the loose thread. All-Afterglow on the brand
// tone; solid ink for 1-color light/print. IDs are namespaced per instance so
// several marks can share a page without gradients cross-referencing.
export default function GaspMark({
  size = 32,
  tone = "afterglow",
  className = "",
}: {
  size?: number;
  tone?: "afterglow" | "ink" | "foam";
  className?: string;
}) {
  const uid = useId();
  const grad = `gm-grad-${uid}`;
  const mask = `gm-mask-${uid}`;
  const stroke =
    tone === "afterglow" ? `url(#${grad})` : tone === "foam" ? "#F5F4F7" : "#0B0B10";
  return (
    <svg
      viewBox="-16 -16 132 132"
      width={size}
      height={size}
      role="img"
      aria-label="Gasp"
      className={className}
    >
      <defs>
        {tone === "afterglow" && (
          <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="88" y2="100">
            <stop offset="0" stopColor="#C043FF" />
            <stop offset="1" stopColor="#FF5C38" />
          </linearGradient>
        )}
        <mask id={mask}>
          <rect x="-16" y="-16" width="132" height="132" fill="white" />
          <path d="M63 47 L60 70" fill="none" stroke="black" strokeWidth="30" strokeLinecap="round" />
        </mask>
      </defs>
      <g fill="none" stroke={stroke} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
        <path d="M55 9 A32 32 0 0 0 0 32 L0 68 A32 32 0 1 0 52 44" />
        <path d="M34 58 L88 58" mask={`url(#${mask})`} />
      </g>
    </svg>
  );
}
