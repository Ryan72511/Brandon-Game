import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

// GET — the user's latest 50 notifications, newest first.
export const GET = withUser(async (user) => {
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, text: true, href: true, read: true, createdAt: true },
  });
  return NextResponse.json(
    rows.map((n) => ({
      id: n.id,
      type: n.type,
      text: n.text,
      href: n.href,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))
  );
});

// POST { action: "read_all" } — mark everything as read.
export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  if (body.action !== "read_all") return jsonError("Unknown action.", 400);
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
});
