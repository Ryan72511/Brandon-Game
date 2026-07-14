import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/constants";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// A real (but useless) scrypt hash. Login/reset run a verify against this when
// the username doesn't exist, so a missing account costs the same CPU as a
// wrong password — no timing oracle for username/email enumeration.
const DUMMY_PASSWORD_HASH = hashPassword("gasp-nonexistent-account-sentinel");
export function dummyVerify(password: string): void {
  verifyPassword(password, DUMMY_PASSWORD_HASH);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, userId } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Secure in production so the year-long bearer token never rides plaintext
    // HTTP; left off in dev so the local http://localhost flow still works.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

const SESSION_MAX_AGE_MS = 365 * 24 * 3600 * 1000;

// Deduplicated per request via react cache() — layouts and pages can both
// call this without double-querying. Expired sessions are deleted lazily.
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE_MS) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  // Suspended mid-session: treat as signed out even if a session row lingers.
  if (session.user.suspended) {
    await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => {});
    return null;
  }
  // Never hand back the password/recovery/token hashes — defense in depth so
  // a careless `<Client user={user}/>` can't serialize secrets to the browser.
  const {
    passwordHash: _p,
    recoveryCodeHash: _r,
    emailVerifyTokenHash: _v,
    resetTokenHash: _t,
    ...safe
  } = session.user;
  void _p;
  void _r;
  void _v;
  void _t;
  return safe;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
