"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The big dark search field on /search. Submitting (Enter) pushes the query
// into the URL so the server page renders the results.
export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
      }}
      className="relative"
    >
      <input
        type="text"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search shows, creators, channels"
        aria-label="Search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={60}
        className="min-h-14 w-full rounded-xl bg-white/[0.08] px-4 pr-14 text-[16px] text-white outline-none ring-1 ring-inset ring-white/15 placeholder:text-white/50 focus:ring-white/40"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </form>
  );
}
