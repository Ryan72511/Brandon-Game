"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="min-h-14 rounded-xl border-2 border-line bg-surface font-bold text-ink-soft"
    >
      Sign out
    </button>
  );
}
