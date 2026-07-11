import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withUser, jsonError, cleanString } from "@/lib/api";
import { saveUpload } from "@/lib/storage";
import { CATEGORIES, CUSTOM_CATEGORY } from "@/lib/constants";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 40) || "channel";
}

interface ChannelInput {
  name: string;
  emoji: string;
  description: string;
  category: string;
  customCategory: string;
  cover: File | null;
}

// Accepts JSON (the watch feed's quick-create: just a name) or multipart
// form data (the full storefront flow: genre, or a custom category with an
// emoji or an uploaded photo).
async function parseInput(req: Request): Promise<ChannelInput> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const cover = form.get("cover");
    return {
      name: cleanString(form.get("name"), 40),
      emoji: cleanString(form.get("emoji"), 8),
      description: cleanString(form.get("description"), 200),
      category: cleanString(form.get("category"), 20),
      customCategory: cleanString(form.get("customCategory"), 30),
      cover: cover instanceof File && cover.size > 0 ? cover : null,
    };
  }
  const body = await req.json().catch(() => ({}));
  return {
    name: cleanString(body.name, 40),
    emoji: cleanString(body.emoji, 8),
    description: cleanString(body.description, 200),
    category: cleanString(body.category, 20),
    customCategory: cleanString(body.customCategory, 30),
    cover: null,
  };
}

export const POST = withUser(async (user, req) => {
  const input = await parseInput(req);
  if (!input.name) return jsonError("Give your channel a name.", 400);

  const isGenre = (CATEGORIES as readonly string[]).includes(input.category);
  const category = isGenre ? input.category : CUSTOM_CATEGORY;
  const customCategory = isGenre ? "" : input.customCategory;
  const emoji = input.emoji || "📺";

  let coverUrl = "";
  if (input.cover) {
    if (!input.cover.type.startsWith("image/")) {
      return jsonError("The category photo must be an image.", 400);
    }
    if (input.cover.size > 8 * 1024 * 1024) {
      return jsonError("Category photos can be up to 8 MB.", 400);
    }
    const ext = (input.cover.name.split(".").pop() || "jpg").toLowerCase();
    const buffer = Buffer.from(await input.cover.arrayBuffer());
    const saved = await saveUpload(buffer, ext, "uploads");
    coverUrl = saved.url;
  }

  // Find a free slug (name, name-2, …). The check races with concurrent
  // creates, so the create itself retries on unique-violation.
  const base = slugify(input.name);
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.channel.findUnique({ where: { slug }, select: { id: true } });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  let channel;
  for (let attempt = 0; ; attempt++) {
    try {
      channel = await prisma.channel.create({
        data: {
          slug,
          name: input.name,
          emoji,
          description: input.description,
          category,
          customCategory,
          coverUrl,
          ownerId: user.id,
        },
      });
      break;
    } catch (err) {
      if ((err as { code?: string }).code === "P2002" && attempt < 3) {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      throw err;
    }
  }
  return NextResponse.json({
    ok: true,
    channel: { id: channel.id, slug: channel.slug, name: channel.name, emoji: channel.emoji },
  });
});
