import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/session";
import { jsonError, cleanString, rateLimitByIp, rateLimitByAccount } from "@/lib/api";

export async function POST(req: Request) {
  const ipLimited = rateLimitByIp(req);
  if (ipLimited) return ipLimited;
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const acctLimited = rateLimitByAccount(username);
  if (acctLimited) return acctLimited;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return jsonError("Wrong username or password.", 401);
  }
  if (user.suspended) {
    return jsonError(
      "This account is suspended for breaking the community guidelines. Contact support@reely.app.",
      403
    );
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
