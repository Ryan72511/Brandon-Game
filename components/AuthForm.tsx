"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AVATAR_EMOJI } from "@/lib/constants";

// One form, two moods: "I'm new here" and "Welcome back". Plain words,
// three fields max.
export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_EMOJI[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "signup"
          ? { username, displayName, password, avatarEmoji }
          : { username, password }
      ),
    });
    setBusy(false);
    if (res.ok) {
      const next = searchParams.get("next") ?? "/";
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't work. Try again.");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Sign in or sign up">
        <button
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => setMode("signup")}
          className={`min-h-12 flex-1 rounded-full font-bold ${
            mode === "signup" ? "bg-accent text-white" : "border-2 border-line bg-surface"
          }`}
        >
          I’m new here
        </button>
        <button
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => setMode("login")}
          className={`min-h-12 flex-1 rounded-full font-bold ${
            mode === "login" ? "bg-accent text-white" : "border-2 border-line bg-surface"
          }`}
        >
          Welcome back
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="like sunny_dan"
            autoComplete="username"
            maxLength={20}
            required
            className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
          />
        </label>
        {mode === "signup" && (
          <>
            <label className="flex flex-col gap-1 font-semibold">
              Your name <span className="font-normal text-ink-soft">(what people see)</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="like Sunny Dan"
                maxLength={40}
                className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
              />
            </label>
            <fieldset>
              <legend className="mb-1 font-semibold">Pick your face</legend>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setAvatarEmoji(e)}
                    aria-pressed={avatarEmoji === e}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl ${
                      avatarEmoji === e ? "border-accent bg-accent-soft" : "border-line bg-surface"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <label className="flex flex-col gap-1 font-semibold">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "at least 6 characters" : ""}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            className="min-h-14 rounded-2xl border-2 border-line bg-surface px-4 text-lg font-normal outline-none focus:border-accent"
          />
        </label>
        {error && <p className="font-semibold text-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="min-h-14 rounded-2xl bg-accent text-lg font-bold text-white disabled:opacity-40"
        >
          {busy ? "One moment…" : mode === "signup" ? "Start watching" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-[14px] text-ink-soft">
        Watching works without an account. Rating, saving and creating need one.
      </p>
    </div>
  );
}
