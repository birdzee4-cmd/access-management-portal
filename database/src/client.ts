import { PrismaClient } from "../generated/client/index.js";

export type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

const missingDatabaseUrlMessage =
  "DATABASE_URL is required for the new Access Management Portal database. " +
  "Use a local SQL Server connection string during development; never use a legacy or production database.";

let singleton: PrismaClient | undefined;

export function requireDatabaseUrl(environment: DatabaseEnvironment = process.env): string {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(missingDatabaseUrlMessage);
  }

  return databaseUrl;
}

/**
 * Returns the process-wide Prisma client for the portal-owned database.
 * Constructing the client does not connect; Prisma connects only when a query is made.
 */
export function getPrismaClient(environment: DatabaseEnvironment = process.env): PrismaClient {
  if (singleton) {
    return singleton;
  }

  const databaseUrl = requireDatabaseUrl(environment);
  singleton = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  return singleton;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!singleton) {
    return;
  }

  const client = singleton;
  singleton = undefined;
  await client.$disconnect();
}

export type PortalPrismaClient = PrismaClient;
