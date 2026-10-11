import { count, eq } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { accessRequests, users } from "@/core/db/schema";

/**
 * The installation's owner (docs/adr/0004, 0048): the one person who may
 * admit new workspaces. Read from the database on every check, so taking
 * the role away takes effect at once. On the auth role, like the rest of
 * admission.
 */

/**
 * The first account on an empty installation is its owner. Everyone after
 * that is an ordinary user until someone with database access says
 * otherwise; the role is never granted from a request. A demo's account
 * never is, however early it comes (backlog P1-09): `existingUsers` counts
 * people, not demo accounts (`countUsers`).
 */
export function platformRoleForNewUser(existingUsers: number, demo = false): "owner" | null {
  return existingUsers === 0 && !demo ? "owner" : null;
}

/** Whether anybody owns the installation yet. */
export async function installationHasOwner(): Promise<boolean> {
  const [row] = await authDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.platformRole, "owner"))
    .limit(1);
  return Boolean(row);
}

export async function isPlatformOwner(userId: string): Promise<boolean> {
  const [row] = await authDb
    .select({ role: users.platformRole })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.role === "owner";
}

/** Throws unless the user owns the installation. */
export async function requirePlatformOwner(userId: string): Promise<void> {
  if (!(await isPlatformOwner(userId))) throw new Error("NOT_PLATFORM_OWNER");
}

export async function pendingAccessRequestCount(): Promise<number> {
  const [row] = await authDb
    .select({ total: count() })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  return Number(row?.total ?? 0);
}
