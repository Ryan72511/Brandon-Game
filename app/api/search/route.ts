import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { EMPTY_RESULTS, normalizeQuery, searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

// GET /api/search?q=... — public search across videos, creators, and channels.
// Queries outside 2-60 chars return empty results rather than an error.
export async function GET(req: Request) {
  const q = normalizeQuery(new URL(req.url).searchParams.get("q"));
  if (!q) return NextResponse.json(EMPTY_RESULTS);
  try {
    return NextResponse.json(await searchAll(q));
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
