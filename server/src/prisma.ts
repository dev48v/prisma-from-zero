// STEP 4 — PrismaClient singleton.
//
// Why a global singleton (and not a fresh client per request)?
//   PrismaClient holds a connection pool — instantiating a new one
//   per request leaks connections and rapidly exhausts Postgres's
//   `max_connections`. In a long-running server, you want ONE client.
//
// Why the `globalThis` dance?
//   tsx watch in dev hot-reloads modules on every save. Without the
//   global cache, each reload creates a new PrismaClient → another
//   pool → another 10 connections → "too many connections" within
//   minutes. The pattern caches the client on globalThis so reloads
//   re-use it. Production never hits this path.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Readiness gate — same pattern as Day 31's pg version. We use
// `$queryRaw` because there's no `prisma.ping()`.
export const waitForReady = async (timeoutMs = 60_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  throw new Error(
    `Postgres not ready within ${timeoutMs}ms: ${(lastError as Error)?.message}`,
  );
};
