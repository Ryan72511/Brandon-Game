import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// WAL lets concurrent readers coexist with a writer — important even at
// demo scale once video views/ratings write while feeds read. busy_timeout
// makes a writer that hits a locked DB wait (up to 5s) instead of throwing
// SQLITE_BUSY, so concurrent rate/view writes don't surface as 500s.
const walReady = (globalThis as unknown as { __walReady?: boolean });
if (!walReady.__walReady) {
  walReady.__walReady = true;
  // queryRaw, not executeRaw: PRAGMA returns a result row in SQLite.
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;").catch(() => {});
}
