"use client";

import { useEffect, useRef } from "react";

// Minimal bottom sheet: backdrop click or Escape closes, close button is
// focused on open so keyboard users are never stranded.
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only: parent re-renders (e.g. after posting a comment) must not
  // re-steal focus to the close button mid-typing.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="sheet-up absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-line/50 text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
