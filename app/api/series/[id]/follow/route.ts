import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";

type Params = [{ params: Promise<{ id: string }> }];

// Toggle following a mini-series so new episodes are easy to return to.
export const POST = withUser<Params>(async (user, _req, { params }) => {
  const { id } = await params;
  const series = await prisma.series.findUnique({
    where: { id },
    select: { id: true, creator: { select: { suspended: true } } },
  });
  if (!series || series.creator.suspended) return jsonError("Series not found.", 404);

  const key = { userId_seriesId: { userId: user.id, seriesId: id } };
  const existing = await prisma.seriesFollow.findUnique({ where: key });
  try {
    if (existing) {
      await prisma.seriesFollow.delete({ where: key });
      return NextResponse.json({ ok: true, following: false });
    }
    await prisma.seriesFollow.create({ data: { userId: user.id, seriesId: id } });
    return NextResponse.json({ ok: true, following: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") return NextResponse.json({ ok: true, following: true });
    if (code === "P2025") return NextResponse.json({ ok: true, following: false });
    throw err;
  }
});
