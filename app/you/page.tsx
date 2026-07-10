import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import ModeSwitch from "@/components/ModeSwitch";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function YouPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/you");

  const [channelCount, friendCount, pendingCount, videoCount] = await Promise.all([
    prisma.channel.count({ where: { ownerId: user.id } }),
    prisma.friendship.count({
      where: {
        status: "accepted",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
    }),
    prisma.friendship.count({ where: { addresseeId: user.id, status: "pending" } }),
    prisma.video.count({ where: { creatorId: user.id } }),
  ]);

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
      </nav>

      <LogoutButton />
    </div>
  );
}
