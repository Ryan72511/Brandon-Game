import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Mark everything read AFTER fetching, so unread styling still shows on
  // this render but the badge clears on the next navigation.
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title="What's new" backHref="/you" />

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-ink-soft">
            Nothing new yet — it fills up as friends and channels get busy.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href}
                className={`flex min-h-16 items-center gap-3 rounded-xl border border-line px-4 py-3 shadow-card ${
                  n.read ? "bg-surface" : "bg-accent-soft"
                }`}
              >
                {!n.read && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
                <span className="flex-1 text-[15px]">{n.text}</span>
                <span className="shrink-0 text-[13px] text-ink-soft">
                  {timeAgo(n.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
