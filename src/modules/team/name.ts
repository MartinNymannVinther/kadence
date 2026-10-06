import { eq } from "drizzle-orm";
import { organizations } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * The team's name as its members know it — "Demo CK U19" — for the head
 * of what leaves Kadence as text, such as "Del ugen". Read under the
 * caller's team context, as the sidebar reads it.
 */
export async function getTeamName(ctx: OrgContext): Promise<string> {
  const [row] = await withOrgContext(ctx, (tx) =>
    tx
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId))
      .limit(1),
  );
  return row?.name ?? "";
}
