import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/session";
import { jsonError, cleanString, rateLimitByIp } from "@/lib/api";
import { AVATAR_COLORS, AVATAR_EMOJI } from "@/lib/constants";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery";
import { MIN_SIGNUP_AGE, ageFromBirthYear, validBirthYear } from "@/lib/age";
import { normalizeEmail, sendEmail, verificationEmail } from "@/lib/email";
import { generateToken, hashToken, expiry, VERIFY_TOKEN_TTL_MS } from "@/lib/tokens";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: Request) {
  const limited = rateLimitByIp(req);
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const username = cleanString(body.username, 20).toLowerCase();
  const email = normalizeEmail(body.email);
  const displayName = cleanString(body.displayName, 40) || username;
  const password = typeof body.password === "string" ? body.password : "";
  const avatarEmoji = cleanString(body.avatarEmoji, 8) || AVATAR_EMOJI[0];
  const birthYear = typeof body.birthYear === "number" ? body.birthYear : Number(body.birthYear);

  if (!USERNAME_RE.test(username)) {
    return jsonError("Username must be 3-20 characters: letters, numbers, underscores.", 400);
  }
  if (!email) {
    return jsonError("Please enter a valid email address.", 400);
  }
  if (password.length < 6) {
    return jsonError("Password must be at least 6 characters.", 400);
  }
  // Declared-age gate (Apple / COPPA).
  if (!validBirthYear(birthYear)) {
    return jsonError("Please tell us the year you were born.", 400);
  }
  if (ageFromBirthYear(birthYear) < MIN_SIGNUP_AGE) {
    return jsonError(
      `You need to be at least ${MIN_SIGNUP_AGE} to join Gasp. Thanks for stopping by!`,
      403
    );
  }

  // One generic message for BOTH collision kinds — saying which field
  // collided would let anyone probe whether an email has an account here.
  const TAKEN_MESSAGE = "That username or email is already taken. Try another, or sign in instead.";
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (existing) {
    return jsonError(TAKEN_MESSAGE, 409);
  }

  const recoveryCode = generateRecoveryCode();
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  // Everyone starts with one channel so "Save" always has a target. The
  // starter slug gets a random suffix on collision; the username unique
  // check re-races under concurrency, so P2002 maps to the friendly 409.
  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        email,
        displayName,
        passwordHash: hashPassword(password),
        avatarEmoji,
        avatarColor,
        birthYear,
        recoveryCodeHash: hashRecoveryCode(recoveryCode),
      },
    });
  } catch (err) {
    // Unique-constraint race under concurrency: same generic 409 as the
    // pre-check — never reveal which field (username or email) collided.
    if ((err as { code?: string }).code === "P2002") {
      return jsonError(TAKEN_MESSAGE, 409);
    }
    throw err;
  }
  try {
    await prisma.channel.create({
      data: {
        slug: `${username}-favorites`,
        name: "My Favorites",
        emoji: "⭐",
        description: "Videos I want to keep.",
        ownerId: user.id,
      },
    });
  } catch {
    await prisma.channel.create({
      data: {
        slug: `${username}-favorites-${Math.random().toString(36).slice(2, 6)}`,
        name: "My Favorites",
        emoji: "⭐",
        description: "Videos I want to keep.",
        ownerId: user.id,
      },
    });
  }
  // Kick off email verification, best-effort: a mail hiccup (or missing
  // provider key) must never block signup — the settings page can re-send.
  try {
    const verifyToken = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyTokenHash: hashToken(verifyToken),
        emailVerifyExpires: expiry(VERIFY_TOKEN_TTL_MS),
      },
    });
    await sendEmail(verificationEmail(email, verifyToken));
  } catch (err) {
    console.error("signup: could not send verification email:", err);
  }
  await createSession(user.id);
  // The recovery code is returned exactly once, right after signup, so the
  // client can show it. We never store or send it again.
  return NextResponse.json({ ok: true, username: user.username, recoveryCode });
}
