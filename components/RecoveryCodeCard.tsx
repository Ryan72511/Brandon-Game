"use client";

import { useState } from "react";

// Shown once after signup or a password reset. The recovery code is the only
// way back in if you forget your password, so we make it big, copyable, and
// impossible to skip past by accident.
export default function RecoveryCodeCard({
  code,
  heading,
  actionLabel,
  onDone,
}: {
  code: string;
  heading: string;
  actionLabel: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers or blocked clipboard: show it so they can copy by hand.
      window.prompt("Copy your recovery code:", code);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold">{heading}</h2>
      <p className="mt-2 text-[15px] text-ink-soft">
        This is the only way to reset your password if you forget it. Write it
        down or screenshot it — we can&apos;t show it again.
      </p>

      <div className="mt-4 rounded-xl border-2 border-line bg-surface p-5 text-center">
        <p className="select-all break-words font-mono text-2xl font-bold tracking-wide">
          {code}
        </p>
      </div>

      <button
        type="button"
        onClick={copy}
        className="mt-3 min-h-12 w-full rounded-xl border-2 border-line bg-surface font-bold"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>

      <button
        type="button"
        onClick={onDone}
        className="mt-3 min-h-14 w-full rounded-xl bg-accent text-lg font-bold text-white"
      >
        {actionLabel}
      </button>
    </div>
  );
}
