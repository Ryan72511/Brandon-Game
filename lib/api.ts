import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type UserRow = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Wraps a handler with auth + uniform error handling.
export function withUser<Args extends unknown[]>(
  handler: (user: UserRow, req: Request, ...args: Args) => Promise<Response>
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) return jsonError("Please sign in first.", 401);
    try {
      return await handler(user, req, ...args);
    } catch (err) {
      console.error(err);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}

export function cleanString(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}
