import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/core/auth/auth";
import { memberships, organizations, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { sqlStateOf } from "@/core/db/sql-state";
import { errorName, log } from "@/core/log";
import { deregisterGarminIn } from "@/modules/devices/exit";
import { memberAddress, memberAddresses } from "@/modules/team/addresses";

/**
 * The workspace itself: who is in it, and the one way out. Deletion runs
 * through `delete_workspace()` in the database, which checks that the
 * caller owns the workspace, removes everything it holds including the
 * audit rows about it, and leaves one context-free row saying it happened.
 * Garmin is told first to forget the workspace's riders (docs/adr/0113),
 * as it must be whenever a rider leaves; the deletion never waits long on
 * Garmin and never fails for it.
 */

export type Member = { userId: string; name: string; email: string; role: string; joinedAt: Date };

/**
 * The members page: the whole team for a coach, only themselves for a
 * rider or a parent — young riders' addresses are not a teammate's to
 * read (ADR 0011). The address comes from `team_member_addresses()`,
 * which hands a coach the team's and anyone else their own, so the rows
 * here are the ones that carry one (docs/adr/0070).
 */
export async function listMembers(ctx: OrgContext): Promise<Member[]> {
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({
        userId: memberships.userId,
        name: users.name,
        email: memberAddress.email,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .innerJoin(memberAddresses, eq(memberAddress.userId, memberships.userId))
      .where(
        and(
          eq(memberships.organizationId, ctx.orgId),
          sql`(app_is_coach() or ${memberships.userId} = ${ctx.userId})`,
        ),
      )
      .orderBy(memberships.createdAt);
    return rows.map((row) => ({ ...row, email: row.email ?? "" }));
  });
}

/**
 * The caller's role in the *active* workspace. Both halves of the where
 * clause matter: RLS on memberships lets a user see their own rows in
 * every workspace they belong to, so filtering on the user alone would
 * return an arbitrary one — and a member of this workspace who owns
 * another would read as an owner here.
 */
export async function currentRole(ctx: OrgContext): Promise<string | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.userId, ctx.userId), eq(memberships.organizationId, ctx.orgId)))
      .limit(1);
    return row?.role ?? null;
  });
}

/** The active workspace's name, as its members see it. */
export async function workspaceName(ctx: OrgContext): Promise<string | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId))
      .limit(1);
    return row?.name ?? null;
  });
}

export { sqlStateOf };

export type DeleteResult = "deleted" | "notOwner" | "nameMismatch" | "failed";

/** Postgres' `insufficient_privilege`, which is how a refusal says so. */
const INSUFFICIENT_PRIVILEGE = "42501";

/**
 * Deletes the active workspace. The person types the workspace's name to
 * confirm; the database function checks ownership itself, so the check
 * here is for the message, not for safety.
 */
export async function deleteWorkspace(
  ctx: OrgContext,
  typedName: string,
  headers: Headers,
): Promise<DeleteResult> {
  const organization = await auth.api.getFullOrganization({
    headers,
    query: { organizationId: ctx.orgId },
  });
  if (!organization) return "failed";
  if (organization.name.trim() !== typedName.trim()) return "nameMismatch";
  if ((await currentRole(ctx)) === "owner") await deregisterGarminIn(ctx);
  try {
    await withOrgContext(ctx, async (tx) => {
      await tx.execute(sql`select delete_workspace(${ctx.orgId})`);
    });
  } catch (error) {
    // The code, not the wording. This branch used to match the text
    // `only the workspace owner` against the exception raised in the
    // database, so a later CREATE OR REPLACE that reworded the sentence
    // would have degraded "you are not the owner" to a nameless failure
    // with no test to notice. drizzle/0016_owner_errcode.sql gives that
    // one raise ERRCODE 42501, and nothing else in delete_workspace()
    // raises it. The old message match is gone rather than kept as a
    // fallback: with it still here, tests/export/workspace would pass on
    // the fallback and go on claiming a path it was no longer taking.
    // Nothing runs against a database this migration has not reached —
    // docker-compose.yml starts the app only on the migration step's
    // `service_completed_successfully`.
    if (sqlStateOf(error) === INSUFFICIENT_PRIVILEGE) return "notOwner";
    await log.error("workspace: delete failed", { orgId: ctx.orgId, error: errorName(error) });
    return "failed";
  }
  return "deleted";
}
