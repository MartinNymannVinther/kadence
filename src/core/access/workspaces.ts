import { and, asc, count, eq, sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { memberships, organizations } from "@/core/db/schema";
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

export type PersonalWorkspace = { orgId: string; name: string };

/**
 * The personal workspace this person owns (docs/adr/0080), or null. One
 * person owns at most one: the rule below, and the hook in
 * src/core/auth/auth.ts that enforces it, keep it so.
 */
export async function personalWorkspaceOf(userId: string): Promise<PersonalWorkspace | null> {
  const [row] = await authDb
    .select({ orgId: organizations.id, name: organizations.name })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, "owner"),
        eq(organizations.kind, "personal"),
      ),
    )
    .orderBy(asc(memberships.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * The one case ADR 0048's rule does not cover (docs/adr/0081): a rider
 * leaving a team takes their training into a personal workspace of their
 * own, which our server code creates for them — never a request, which
 * `canCreateWorkspace` still refuses while they belong to a team. One
 * such workspace per person: a second is refused.
 */
export async function canCreatePersonalWorkspace(userId: string): Promise<boolean> {
  return (await personalWorkspaceOf(userId)) === null;
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
