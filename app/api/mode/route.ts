import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError } from "@/lib/api";
import { MODE_WATCHING, MODE_CREATING } from "@/lib/constants";

export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const mode = body.mode;
  if (mode !== MODE_WATCHING && mode !== MODE_CREATING) {
    return jsonError("Unknown mode.", 400);
  }
  await prisma.user.update({ where: { id: user.id }, data: { mode } });
  return NextResponse.json({ ok: true, mode });
});
