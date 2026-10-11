import { eq } from "drizzle-orm";
import { cache } from "react";
import { organizations } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * The team's name as its members know it — "Demo CK U19" — for the
 * sidebar's lockup and the head of what leaves Kadence as text, such as
 * "Del ugen". Read under the caller's team context, and cached per
 * request: the layout asks, and the calendar asks again.
 */
export function getTeamName(ctx: OrgContext): Promise<string> {
  return teamNameFor(ctx.orgId, ctx.userId);
}

const teamNameFor = cache(async (orgId: string, userId: string): Promise<string> => {
  const [row] = await withOrgContext({ orgId, userId }, (tx) =>
    tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
  );
  return row?.name ?? "";
});
