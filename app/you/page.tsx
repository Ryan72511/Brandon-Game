import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import ModeSwitch from "@/components/ModeSwitch";
import LogoutButton from "@/components/LogoutButton";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export const dynamic = "force-dynamic";

export default async function YouPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/you");

  const isAdmin = user.role === "admin";
  const [channelCount, friendCount, pendingCount, videoCount, unreadCount, openReportCount, reviewQueueCount] =
    await Promise.all([
      prisma.channel.count({ where: { ownerId: user.id } }),
      prisma.friendship.count({
        where: {
          status: "accepted",
          OR: [{ requesterId: user.id }, { addresseeId: user.id }],
        },
      }),
      prisma.friendship.count({ where: { addresseeId: user.id, status: "pending" } }),
      prisma.video.count({ where: { creatorId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
      isAdmin ? prisma.report.count({ where: { status: "open" } }) : 0,
      isAdmin ? prisma.video.count({ where: { status: "pending" } }) : 0,
    ]);
  const moderationCount = openReportCount + reviewQueueCount;

  return (
    <div className="flex flex-col gap-5 p-4">
      <PageHeader title="You" />

      <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
        <Avatar emoji={user.avatarEmoji} color={user.avatarColor} size={64} />
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold">{user.displayName}</p>
          <p className="text-ink-soft">@{user.username}</p>
          {user.bio && <p className="mt-1 text-[15px]">{user.bio}</p>}
        </div>
      </div>

      <ModeSwitch mode={user.mode} />

      <nav className="flex flex-col gap-3">
        <Link
          href="/notifications"
          className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="flex-1 font-bold">What&apos;s new</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[14px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </Link>
        <Link
          href="/friends"
          className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
        >
          <span className="text-2xl" aria-hidden>
            👋
          </span>
          <span className="flex-1 font-bold">Friends</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[14px] font-bold text-white">
              {pendingCount} new
            </span>
          )}
          <span className="text-ink-soft">
            {friendCount} {friendCount === 1 ? "friend" : "friends"} ›
          </span>
        </Link>
        <Link
          href="/channels"
          className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
        >
          <span className="text-2xl" aria-hidden>
            📺
          </span>
          <span className="flex-1 font-bold">Your channels</span>
          <span className="text-ink-soft">{channelCount} ›</span>
        </Link>
        <Link
          href={`/creator/${user.username}`}
          className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
        >
          <span className="text-2xl" aria-hidden>
            🎬
          </span>
          <span className="flex-1 font-bold">Your creator page</span>
          <span className="text-ink-soft">
            {videoCount} {videoCount === 1 ? "video" : "videos"} ›
          </span>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-card"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="flex-1 font-bold">Moderation</span>
            {moderationCount > 0 && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[14px] font-bold text-white">
                {moderationCount}
              </span>
            )}
          </Link>
        )}
      </nav>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[14px] font-bold uppercase tracking-wide text-ink-soft">
          About &amp; legal
        </h2>
        {[
          { href: "/about/support", label: "Support" },
          { href: "/about/guidelines", label: "Community guidelines" },
          { href: "/about/terms", label: "Terms of use" },
          { href: "/about/privacy", label: "Privacy policy" },
          { href: "/about/copyright", label: "Copyright" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-12 items-center rounded-xl border border-line bg-surface px-4 text-[15px]"
          >
            <span className="flex-1">{item.label}</span>
            <span className="text-ink-soft" aria-hidden>
              ›
            </span>
          </Link>
        ))}
      </section>

      <LogoutButton />
      <DeleteAccountButton username={user.username} />
    </div>
  );
}
