import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// WAL lets concurrent readers coexist with a writer — important even at
// demo scale once video views/ratings write while feeds read.
const walReady = (globalThis as unknown as { __walReady?: boolean });
if (!walReady.__walReady) {
  walReady.__walReady = true;
  // queryRaw, not executeRaw: PRAGMA returns a result row in SQLite.
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
}
