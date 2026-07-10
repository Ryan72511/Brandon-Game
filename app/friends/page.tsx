import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import FriendControls, { AddFriendForm } from "@/components/FriendControls";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/friends");

  const userSelect = {
    select: { username: true, displayName: true, avatarEmoji: true, avatarColor: true },
  };
  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: user.id, status: "pending" },
      include: { requester: userSelect },
    }),
    prisma.friendship.findMany({
      where: { requesterId: user.id, status: "pending" },
      include: { addressee: userSelect },
    }),
    prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
      include: { requester: userSelect, addressee: userSelect },
    }),
  ]);

  const friends = accepted.map((f) =>
    f.requesterId === user.id ? f.addressee : f.requester
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader title="👋 Friends" backHref="/you" />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Add a friend</h2>
        <p className="text-[15px] text-ink-soft">
          Ask them for their username, then type it here.
        </p>
        <AddFriendForm />
      </section>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Wants to be your friend</h2>
          {incoming.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-card"
            >
              <Avatar emoji={f.requester.avatarEmoji} color={f.requester.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{f.requester.displayName}</p>
                <p className="text-[14px] text-ink-soft">@{f.requester.username}</p>
              </div>
              <FriendControls friendshipId={f.id} />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Your friends</h2>
        {friends.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-ink-soft">
            No friends yet — add someone above, or share a channel you love.
          </p>
        ) : (
          friends.map((f) => (
            <Link
              key={f.username}
              href={`/creator/${f.username}`}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-surface px-3 shadow-card"
            >
              <Avatar emoji={f.avatarEmoji} color={f.avatarColor} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{f.displayName}</p>
                <p className="text-[14px] text-ink-soft">@{f.username}</p>
              </div>
              <span className="text-ink-soft">›</span>
            </Link>
          ))
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Waiting for a yes</h2>
          {outgoing.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <Avatar emoji={f.addressee.avatarEmoji} color={f.addressee.avatarColor} size={44} />
              <p className="flex-1 font-semibold">{f.addressee.displayName}</p>
              <p className="text-[14px] text-ink-soft">Invited ✓</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
