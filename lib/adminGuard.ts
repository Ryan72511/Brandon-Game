import { getCurrentUser } from "@/lib/session";

// Server-side admin gate. Pages call this and redirect("/") on null;
// API routes check user.role themselves inside withUser.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
