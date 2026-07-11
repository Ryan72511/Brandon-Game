import { prisma } from "@/lib/db";

// Creating a notification must never break the action that triggered it,
// so both helpers swallow their own errors and just log.

export async function notify(userId: string, type: string, text: string, href: string) {
  try {
    await prisma.notification.create({ data: { userId, type, text, href } });
  } catch (err) {
    console.error("notify failed:", err);
  }
}

export async function notifyMany(userIds: string[], type: string, text: string, href: string) {
  const ids = userIds.slice(0, 500);
  if (ids.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type, text, href })),
    });
  } catch (err) {
    console.error("notifyMany failed:", err);
  }
}
