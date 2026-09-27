import { and, eq, inArray } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { memberships } from "@/core/db/schema";

/**
 * Better Auth's organization plugin answers any member with the whole
 * team's invitations — each id the key to a join link — and every member's
 * address. In a family tool that is a colleague list; on a cycling team it
 * is young riders' addresses, and a pending invitation any teammate could
 * register as (a rider becoming a coach, a teammate becoming a parent).
 * These endpoints are for the people who manage the team: owners and
 * admins, Kadence's coaches (ADR 0010). The hook in auth.ts asks here.
 */
export const COACH_ONLY_PATHS = new Set([
  "/organization/list-invitations",
  "/organization/get-full-organization",
  "/organization/set-active",
  "/organization/list-members",
]);

type Member = { userId?: unknown };

/**
 * The same answer with only what a rider or parent may have: no
 * invitations, and themselves as the only member. The org switcher still
 * gets the team's id and name; nothing else leaves.
 */
export function trimForMember(path: string, returned: unknown, userId: string): unknown {
  if (path === "/organization/list-invitations") return [];
  if (path === "/organization/list-members") {
    const value = returned as { members?: Member[]; total?: number } | null;
    const members = (value?.members ?? []).filter((m) => m.userId === userId);
    return { ...(value ?? {}), members, total: members.length };
  }
  if (returned && typeof returned === "object" && !Array.isArray(returned)) {
    const org = returned as { members?: Member[]; invitations?: unknown[] };
    return {
      ...org,
      ...(org.members ? { members: org.members.filter((m) => m.userId === userId) } : {}),
      ...(org.invitations ? { invitations: [] } : {}),
    };
  }
  return returned;
}

export async function coachesTeam(userId: string, orgId: string): Promise<boolean> {
  const [row] = await authDb
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, orgId),
        inArray(memberships.role, ["owner", "admin"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}
