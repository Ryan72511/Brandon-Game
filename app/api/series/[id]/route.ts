import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

// Rename a series / edit its description — owner only.
export const PATCH = withUser<Params>(async (user, req, { params }) => {
  const { id } = await params;
  const series = await prisma.series.findUnique({ where: { id }, select: { creatorId: true } });
  if (!series) return jsonError("Series not found.", 404);
  if (series.creatorId !== user.id) return jsonError("This isn't your series.", 403);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { title?: string; description?: string } = {};

  if (body.title !== undefined) {
    const title = cleanString(body.title, 80);
    if (!title) return jsonError("Give your series a name.", 400);
    data.title = title;
  }
  if (body.description !== undefined) data.description = cleanString(body.description, 300);

  await prisma.series.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
});
