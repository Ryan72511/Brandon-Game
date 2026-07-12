import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, cleanString, jsonError } from "@/lib/api";
import { AVATAR_COLORS } from "@/lib/constants";

export const PATCH = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string> = {};

  if (typeof body.displayName === "string") {
    const v = cleanString(body.displayName, 40);
    if (v) data.displayName = v;
  }
  if (typeof body.bio === "string") data.bio = cleanString(body.bio, 200);
  if (typeof body.avatarEmoji === "string") {
    const v = cleanString(body.avatarEmoji, 8);
    if (v) data.avatarEmoji = v;
  }
  if (typeof body.avatarColor === "string") {
    // Colors come from the fixed palette only — no arbitrary CSS values.
    if ((AVATAR_COLORS as readonly string[]).includes(body.avatarColor)) {
      data.avatarColor = body.avatarColor;
    }
  }
  if (typeof body.featuredVideoId === "string") {
    // The demo reel must be one of your own published videos ("" clears it).
    const id = cleanString(body.featuredVideoId, 40);
    if (id) {
      const own = await prisma.video.findFirst({
        where: { id, creatorId: user.id, status: "published" },
        select: { id: true },
      });
      if (!own) return jsonError("Pick one of your own published videos.", 400);
    }
    data.featuredVideoId = id;
  }
  if (typeof body.creatorAbout === "string") data.creatorAbout = cleanString(body.creatorAbout, 2000);
  if (typeof body.creatorProcess === "string") data.creatorProcess = cleanString(body.creatorProcess, 2000);
  if (Array.isArray(body.creatorTools)) {
    const tools = body.creatorTools
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 20);
    data.creatorTools = JSON.stringify(tools);
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
});
