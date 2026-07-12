import Link from "next/link";

export default function PageHeader({
  title,
  backHref,
  action,
  dark = false,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b px-4 py-2 backdrop-blur ${
        dark ? "border-white/[0.06] bg-night-raised/85" : "border-line bg-surface/95"
      }`}
    >
      {backHref && (
        <Link
          href={backHref}
          className={`-ml-2 flex min-h-12 items-center gap-1 pr-2 font-semibold ${
            dark ? "text-white" : "text-accent"
          }`}
        >
          ‹ Back
        </Link>
      )}
      <h1 className={`display flex-1 truncate text-xl font-bold ${dark ? "text-night-ink" : ""}`}>
        {title}
      </h1>
      {action}
    </header>
  );
}
