import Link from "next/link";

export default function PageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur">
      {backHref && (
        <Link
          href={backHref}
          className="-ml-2 flex min-h-12 items-center gap-1 pr-2 font-semibold text-accent"
        >
          ‹ Back
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
      {action}
    </header>
  );
}
