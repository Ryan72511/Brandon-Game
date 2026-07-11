// Designed line-art genre marks — the "logo" glyph on channel tiles.
// One consistent 24x24 stroke system (Lucide-style): 1.8px round strokes.
const MARKS: Record<string, React.ReactNode> = {
  comedy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 13.5c.9 2.4 2.5 3.6 4.5 3.6s3.6-1.2 4.5-3.6H7.5Z" />
      <path d="M8.5 9.2c.5-.7 1.5-.7 2 0M13.5 9.2c.5-.7 1.5-.7 2 0" />
    </>
  ),
  drama: (
    <>
      <path d="M5 4h9v7.5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.4 8h1M11.1 8h1M8 12.8c.6-.7 2.4-.7 3 0" />
      <path d="M14 8h5v7.5a4.5 4.5 0 0 1-4.5 4.5c-1.5 0-2.8-.7-3.6-1.8" />
    </>
  ),
  romcom: (
    <>
      <path d="M12 20.5 4.8 13a4.7 4.7 0 0 1 6.7-6.7l.5.6.5-.6A4.7 4.7 0 0 1 19.2 13L12 20.5Z" />
      <path d="M9.3 11.5c1.5 1.7 3.9 1.7 5.4 0" />
    </>
  ),
  romance: (
    <path d="M12 20.5 4.8 13a4.7 4.7 0 0 1 6.7-6.7l.5.6.5-.6A4.7 4.7 0 0 1 19.2 13L12 20.5Z" />
  ),
  horror: (
    <>
      <path d="M5 21V10a7 7 0 0 1 14 0v11l-2.4-2-2.3 2-2.3-2-2.3 2-2.3-2L5 21Z" />
      <circle cx="9.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  thriller: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  mystery: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5.5 5.5" />
    </>
  ),
  scifi: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M3.5 14.5c2.5 1.7 6.8 2.7 11 1.6 3.5-.9 6-2.6 6-4.3" />
    </>
  ),
  fantasy: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  action: <path d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2Z" />,
  adventure: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  animation: (
    <>
      <path d="M16.5 3.5 20.5 7.5 8 20l-4.5.5L4 16 16.5 3.5Z" />
      <path d="m14 6 4 4" />
    </>
  ),
  documentary: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" />
    </>
  ),
  reality: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="m8 3 4 4 4-4" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a13 13 0 0 0 0 18M12 3a13 13 0 0 1 0 18M3.5 9.5h17M3.5 14.5h17" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5.5L20 4v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  gaming: (
    <>
      <path d="M6.5 7h11A4.5 4.5 0 0 1 22 11.5V15a3 3 0 0 1-5.4 1.8L15 15H9l-1.6 1.8A3 3 0 0 1 2 15v-3.5A4.5 4.5 0 0 1 6.5 7Z" />
      <path d="M8 10v3M6.5 11.5h3M15.5 10.5h.01M17.5 12.5h.01" />
    </>
  ),
  food: (
    <>
      <circle cx="10" cy="12" r="7" />
      <circle cx="10" cy="12" r="3.5" />
      <path d="M17 12h4.5" />
    </>
  ),
  travel: <path d="M21.5 3.5 3 10.5l6 2.5 2.5 6 3-5.5 7-10Z" />,
  animals: (
    <>
      <circle cx="7" cy="9" r="1.7" />
      <circle cx="12" cy="7" r="1.7" />
      <circle cx="17" cy="9" r="1.7" />
      <path d="M12 11.5c-2.8 0-5 2.2-5 4.4 0 1.4 1.1 2.1 2.4 1.8 1-.2 1.7-.5 2.6-.5s1.6.3 2.6.5c1.3.3 2.4-.4 2.4-1.8 0-2.2-2.2-4.4-5-4.4Z" />
    </>
  ),
  kids: (
    <>
      <path d="M12 15a5.5 5.5 0 1 0-5.5-5.5A5.5 5.5 0 0 0 12 15Z" />
      <path d="m12 15-1.5 2h3L12 21" />
    </>
  ),
  learning: (
    <>
      <path d="M12 6c-1.8-1.6-4.5-2-8-1.4V18c3.5-.6 6.2-.2 8 1.4 1.8-1.6 4.5-2 8-1.4V4.6c-3.5-.6-6.2-.2-8 1.4Z" />
      <path d="M12 6v13.4" />
    </>
  ),
  motivation: (
    <path d="M12 22c4 0 7-2.8 7-6.5 0-2.5-1.3-4.3-2.7-6C15 8 14 6.5 14 4c-3 1.5-4 4-3.6 6.4C9.5 9.7 9 8.8 9 7.5 6.8 9 5 11.5 5 15.5 5 19.2 8 22 12 22Z" />
  ),
  lifestyle: (
    <>
      <path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z" />
      <path d="M4 20C9 15 13 11 17 7" />
    </>
  ),
  shorts: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.8 1.6M9.5 2.5h5" />
    </>
  ),
  surprise: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  weekly: (
    <>
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 15v3M8.5 21h7M10 18h4" />
    </>
  ),
};

// Fallback: a play-tile mark for anything unmapped.
const FALLBACK = (
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <path d="m10.5 9 5 3-5 3V9Z" />
  </>
);

export default function GenreIcon({
  genre,
  size = 24,
  className = "",
}: {
  genre: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {MARKS[genre] ?? FALLBACK}
    </svg>
  );
}
