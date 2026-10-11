import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/core/env";
import * as schema from "./schema";

/**
 * Two separate connection pools, two separate database roles:
 *
 * - appPool/appDb  → role `kadence_app`: every domain query. Fully subject to
 *   RLS; without an org context set it sees nothing (default deny).
 * - authPool/authDb → role `kadence_auth`: used only by Better Auth and the
 *   admission flow, which by nature must look up users before an org
 *   context exists. The role is only granted access to the auth tables.
 *
 * Neither role can bypass RLS. Migrations run through a third connection
 * (MIGRATION_DATABASE_URL) used exclusively by drizzle-kit.
 */

const globalForDb = globalThis as unknown as {
  kadenceAppPool?: Pool;
  kadenceAuthPool?: Pool;
};

/**
 * How the pools wait (docs/adr/0083). A request that cannot get a
 * connection within five seconds fails rather than queues behind a
 * stuck one, and a connection idle for thirty is closed, so a quiet
 * installation holds few. The database ends a statement after thirty
 * seconds and a transaction left idle after fifteen, set on the roles
 * themselves (drizzle/0043), so every connection has them whoever opens
 * it.
 */
const waiting = { max: 10, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 };

export const appPool =
  globalForDb.kadenceAppPool ?? new Pool({ connectionString: env.APP_DATABASE_URL, ...waiting });

export const authPool =
  globalForDb.kadenceAuthPool ?? new Pool({ connectionString: env.AUTH_DATABASE_URL, ...waiting });

if (env.NODE_ENV !== "production") {
  globalForDb.kadenceAppPool = appPool;
  globalForDb.kadenceAuthPool = authPool;
}

export const appDb = drizzle(appPool, { schema });
export const authDb = drizzle(authPool, { schema });
