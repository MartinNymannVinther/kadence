import { asc, count, eq, sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { memberships } from "@/core/db/schema";
import { isPlatformOwner } from "./service";

/**
 * Who may create a workspace (docs/adr/0048). On an installation that
 * hosts many clubs, a new club comes in through an application the owner
 * approves (ADR 0004), and the approved registration creates the club's
 * workspace. Better Auth would otherwise let anyone signed in create as
 * many as they like. So: the installation's owner may always; anyone
 * else only while they belong to no workspace at all — the moment of
 * their own approved registration, the very first account, and a demo.
 */
export async function canCreateWorkspace(userId: string): Promise<boolean> {
  if (await isPlatformOwner(userId)) return true;
  const [row] = await authDb
    .select({ n: count() })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  return (row?.n ?? 0) === 0;
}

/**
 * The workspace a new session opens: the one this person made active
 * last, and otherwise the oldest they belong to. Without an order the
 * database would pick one at random, which is harmless with one club and
 * confusing with two.
 */
export async function defaultWorkspaceId(userId: string): Promise<string | null> {
  const [row] = await authDb
    .select({ organizationId: memberships.organizationId })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(sql`${memberships.lastActiveAt} desc nulls last`, asc(memberships.createdAt))
    .limit(1);
  return row?.organizationId ?? null;
}

/** Remembers that this person opened this workspace now. */
export async function markWorkspaceUsed(userId: string, organizationId: string): Promise<void> {
  await authDb
    .update(memberships)
    .set({ lastActiveAt: new Date() })
    .where(
      sql`${memberships.userId} = ${userId} and ${memberships.organizationId} = ${organizationId}`,
    );
}
