import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 40) || "channel";
}

export const POST = withUser(async (user, req) => {
  const body = await req.json().catch(() => ({}));
  const name = cleanString(body.name, 40);
  if (!name) return jsonError("Give your channel a name.", 400);
  const emoji = cleanString(body.emoji, 8) || "📺";
  const description = cleanString(body.description, 200);
  const category = cleanString(body.category, 20) || "mixed";

  // Find a free slug: name, name-2, name-3...
  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.channel.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const channel = await prisma.channel.create({
    data: { slug, name, emoji, description, category, ownerId: user.id },
  });
  return NextResponse.json({
    ok: true,
    channel: { id: channel.id, slug: channel.slug, name: channel.name, emoji: channel.emoji },
  });
});
