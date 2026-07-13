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
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only: parent re-renders (e.g. after posting a comment) must not
  // re-steal focus to the close button mid-typing.
  useEffect(() => {
    // Remember what had focus so we can restore it when the sheet closes.
    const returnTo = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    // Lock the page behind the sheet so the feed doesn't scroll under it.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Trap Tab within the sheet — keyboard focus must not walk onto the
      // obscured feed/controls behind an open dialog.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnTo?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        className="sheet-up light-scope absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-card"
      >
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
