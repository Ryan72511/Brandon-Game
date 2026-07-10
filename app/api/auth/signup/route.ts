import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/session";
import { jsonError, cleanString } from "@/lib/api";
import { AVATAR_COLORS, AVATAR_EMOJI } from "@/lib/constants";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const displayName = cleanString(body.displayName, 40) || username;
  const password = typeof body.password === "string" ? body.password : "";
  const avatarEmoji = cleanString(body.avatarEmoji, 8) || AVATAR_EMOJI[0];

  if (!USERNAME_RE.test(username)) {
    return jsonError("Username must be 3-20 characters: letters, numbers, underscores.", 400);
  }
  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return jsonError("That username is taken. Try another.", 409);

  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: hashPassword(password),
      avatarEmoji,
      avatarColor,
      channels: {
        // Everyone starts with one channel so "Save" always has a target.
        create: {
          slug: `${username}-favorites`,
          name: "My Favorites",
          emoji: "⭐",
          description: "Videos I want to keep.",
        },
      },
    },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username });
}
