import Link from "next/link";
import GaspMark from "@/components/GaspMark";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <GaspMark size={52} />
      <h1 className="text-2xl font-bold display">That one&apos;s not showing</h1>
      <p className="text-ink-soft">
        The video or page you&apos;re after was moved, removed, or never existed.
      </p>
      <Link
        href="/"
        className="min-h-12 rounded-xl bg-accent px-6 py-3 font-bold text-white"
      >
        Back to watching
      </Link>
    </div>
  );
}
