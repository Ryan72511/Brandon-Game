import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import PageHeader from "@/components/PageHeader";
import { timeAgo } from "@/lib/format";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

// Keep in sync with the reason keys validated in app/api/reports/route.ts.
const REASON_LABELS: Record<string, string> = {
  not_for_kids: "Not right for kids",
  harmful: "Harmful or bullying",
  hateful: "Hateful",
  copyright: "Stolen or copyrighted",
  spam: "Spam or scam",
  other: "Something else",
};

const RESOLUTION_LABELS: Record<string, string> = {
  dismissed: "Dismissed",
  video_removed: "Video removed",
  creator_suspended: "Creator suspended",
  comment_removed: "Comment removed",
};

const CARD = "rounded-xl border border-line bg-surface p-4 shadow-card";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const [pendingVideos, openReports, resolvedReports, suspendedUsers] = await Promise.all([
    prisma.video.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { creator: { select: { username: true, displayName: true } } },
    }),
    prisma.report.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reporter: { select: { username: true } } },
    }),
    prisma.report.findMany({
      where: { status: "resolved" },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: { suspended: true },
      orderBy: { username: "asc" },
      select: { id: true, username: true, displayName: true },
    }),
  ]);

  // The Report row stores plain ids (targets can vanish), so look up what
  // still exists in one batch per type to describe each report.
  const ids = (key: "videoId" | "creatorId" | "commentId") => [
    ...new Set(openReports.map((r) => r[key]).filter((v): v is string => !!v)),
  ];
  const videoIds = ids("videoId");
  const creatorIds = ids("creatorId");
  const commentIds = ids("commentId");

  const [targetVideos, targetUsers, targetComments] = await Promise.all([
    videoIds.length
      ? prisma.video.findMany({
          where: { id: { in: videoIds } },
          select: { id: true, title: true, status: true },
        })
      : [],
    creatorIds.length
      ? prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, username: true, suspended: true },
        })
      : [],
    commentIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, text: true },
        })
      : [],
  ]);
  const videoById = new Map(targetVideos.map((v) => [v.id, v]));
  const userById = new Map(targetUsers.map((u) => [u.id, u]));
  const commentById = new Map(targetComments.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader title="Moderation" backHref="/you" />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Waiting for review</h2>
        {pendingVideos.length === 0 && (
          <p className="text-ink-soft">Nothing is waiting for review.</p>
        )}
        {pendingVideos.map((v) => (
          <div key={v.id} className={`flex flex-col gap-3 ${CARD}`}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumb} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  <Link href={`/watch/${v.id}`}>{v.title}</Link>
                </p>
                <p className="text-[15px] text-ink-soft">
                  <Link href={`/creator/${v.creator.username}`}>@{v.creator.username}</Link>
                  {" · "}
                  {timeAgo(v.createdAt)}
                </p>
              </div>
              {v.mature && (
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[13px] font-bold text-accent">
                  Mature
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                label="Approve"
                payload={{ action: "approve_video", videoId: v.id }}
              />
              <AdminActionButton
                label="Reject"
                destructive
                payload={{ action: "reject_video", videoId: v.id }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Open reports</h2>
        {openReports.length === 0 && <p className="text-ink-soft">No open reports. Nice.</p>}
        {openReports.map((r) => {
          const video = r.videoId ? videoById.get(r.videoId) : undefined;
          const person = r.creatorId ? userById.get(r.creatorId) : undefined;
          const comment = r.commentId ? commentById.get(r.commentId) : undefined;
          return (
            <div key={r.id} className={`flex flex-col gap-2 ${CARD}`}>
              <p className="font-bold">{REASON_LABELS[r.reason] ?? r.reason}</p>
              {r.detail && <p className="text-[15px]">{r.detail}</p>}
              <p className="text-[15px]">
                {r.targetType === "video" && (
                  <>
                    Video:{" "}
                    {video ? (
                      <Link href={`/watch/${video.id}`} className="font-semibold text-accent underline">
                        {video.title}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">(video no longer exists)</span>
                    )}
                  </>
                )}
                {r.targetType === "creator" && (
                  <>
                    Creator:{" "}
                    {person ? (
                      <Link
                        href={`/creator/${person.username}`}
                        className="font-semibold text-accent underline"
                      >
                        @{person.username}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">(account no longer exists)</span>
                    )}
                  </>
                )}
                {r.targetType === "comment" && (
                  <>
                    Comment by{" "}
                    {person ? (
                      <Link
                        href={`/creator/${person.username}`}
                        className="font-semibold text-accent underline"
                      >
                        @{person.username}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">(account no longer exists)</span>
                    )}
                    :{" "}
                    {comment ? (
                      <span>
                        &ldquo;{comment.text.slice(0, 120)}
                        {comment.text.length > 120 ? "…" : ""}&rdquo;
                      </span>
                    ) : (
                      <span className="text-ink-soft">(comment already removed)</span>
                    )}
                  </>
                )}
              </p>
              <p className="text-[14px] text-ink-soft">
                Reported by @{r.reporter.username} · {timeAgo(r.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <AdminActionButton
                  label="Dismiss"
                  payload={{ action: "resolve_report", reportId: r.id, resolution: "dismissed" }}
                />
                {r.targetType === "video" && r.videoId && (
                  <AdminActionButton
                    label="Remove video"
                    destructive
                    payload={{ action: "remove_video", videoId: r.videoId, reportId: r.id }}
                  />
                )}
                {r.targetType === "creator" && r.creatorId && (
                  <AdminActionButton
                    label="Suspend creator"
                    destructive
                    payload={{ action: "suspend_user", userId: r.creatorId, reportId: r.id }}
                  />
                )}
                {r.targetType === "comment" && (
                  <>
                    {r.commentId && (
                      <AdminActionButton
                        label="Remove comment"
                        destructive
                        payload={{ action: "remove_comment", commentId: r.commentId, reportId: r.id }}
                      />
                    )}
                    {r.creatorId && (
                      <AdminActionButton
                        label="Suspend commenter"
                        destructive
                        payload={{ action: "suspend_user", userId: r.creatorId, reportId: r.id }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Recently resolved</h2>
        {resolvedReports.length === 0 && <p className="text-ink-soft">Nothing resolved yet.</p>}
        {resolvedReports.map((r) => (
          <div key={r.id} className={`flex items-center gap-3 ${CARD}`}>
            <p className="min-w-0 flex-1 truncate font-semibold">
              {REASON_LABELS[r.reason] ?? r.reason}
            </p>
            <p className="shrink-0 text-[15px] text-ink-soft">
              {RESOLUTION_LABELS[r.resolution] ?? r.resolution}
              {r.resolvedAt ? ` · ${timeAgo(r.resolvedAt)}` : ""}
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Suspended accounts</h2>
        {suspendedUsers.length === 0 && <p className="text-ink-soft">No suspended accounts.</p>}
        {suspendedUsers.map((u) => (
          <div key={u.id} className={`flex items-center gap-3 ${CARD}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{u.displayName}</p>
              <p className="text-[15px] text-ink-soft">@{u.username}</p>
            </div>
            <AdminActionButton
              label="Unsuspend"
              payload={{ action: "unsuspend_user", userId: u.id }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
