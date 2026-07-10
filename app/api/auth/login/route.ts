import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/session";
import { jsonError, cleanString } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return jsonError("Wrong username or password.", 401);
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
