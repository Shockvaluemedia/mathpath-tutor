import { PrismaClient } from "@prisma/client";

// Construct DATABASE_URL from individual env vars if not provided directly
// This supports ECS deployments where credentials come from Secrets Manager
function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Construct from individual vars (ECS deployment)
  const secret = process.env.DB_SECRET;
  if (secret) {
    try {
      const parsed = JSON.parse(secret);
      const host = process.env.DB_HOST || parsed.host || "localhost";
      const port = process.env.DB_PORT || parsed.port || "5432";
      const dbName = process.env.DB_NAME || "mathpath_tutor";
      return `postgresql://${parsed.username}:${parsed.password}@${host}:${port}/${dbName}`;
    } catch {
      // Secret isn't JSON, use as-is
    }
  }

  return undefined;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = getDatabaseUrl();

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined
);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

/**
 * Backward-compatible any-typed alias for transitional production code.
 * Use `prisma` directly for new code with proper types.
 */
export const db = prisma as any;
