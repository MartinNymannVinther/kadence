import { and, eq, sql } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import { invitations, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * Links a member to the rider or guardian rows a coach prepared for the
 * invitations they accepted to this team. The accepted invitations are
 * read on the auth role (the application role has no access to them);
 * the linking itself is `claim_invitation_links` (drizzle/0003), which
 * checks again that each invitation was accepted by this person, to this
 * team, for their own address. Returns how many rows were linked.
 */
export async function claimPendingLinks(ctx: OrgContext): Promise<number> {
  const accepted = await authDb
    .select({ id: invitations.id })
    .from(invitations)
    .innerJoin(users, sql`lower(${users.email}) = lower(${invitations.email})`)
    .where(
      and(
        eq(users.id, ctx.userId),
        eq(invitations.organizationId, ctx.orgId),
        eq(invitations.status, "accepted"),
      ),
    )
    .limit(20);
  if (accepted.length === 0) return 0;
  return withOrgContext(ctx, async (tx) => {
    let linked = 0;
    for (const { id } of accepted) {
      const result = await tx.execute(sql`select claim_invitation_links(${id}) as n`);
      linked += Number((result.rows[0] as { n: number } | undefined)?.n ?? 0);
    }
    return linked;
  });
}
