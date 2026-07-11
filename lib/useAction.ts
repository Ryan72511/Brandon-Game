"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The app's standard mutation pattern: busy flag, friendly error, optional
// refresh/redirect — with double-submit protection built in.
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run<T = unknown>(
    input: RequestInfo,
    init: RequestInit,
    opts: { refresh?: boolean; redirect?: (data: T) => string } = {}
  ): Promise<T | null> {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(input, init);
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "That didn't work. Try again.");
        return null;
      }
      if (opts.redirect) router.push(opts.redirect(data));
      if (opts.refresh) router.refresh();
      return data;
    } catch {
      setError("Network hiccup — try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, run };
}
