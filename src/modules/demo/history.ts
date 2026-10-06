import { inArray } from "drizzle-orm";
import { riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";

/**
 * The demo's riders have been on the team since the first week the demo
 * plans (seed.ts), as a team in full swing would have, so the coaches'
 * card with the team's three numbers (docs/adr/0066) has weeks to show:
 * a rider counts from their first full week. Only the rider rows' own
 * date moves. The audit log keeps what really happened, so the planning
 * minutes are the seeding itself, this week.
 */
export async function ridersSince(
  ctx: OrgContext,
  riderIds: string[],
  monday: string,
): Promise<void> {
  // 10:00 UTC is the same Copenhagen day in summer and in winter.
  await withOrgContext(ctx, (tx) =>
    tx
      .update(riders)
      .set({ createdAt: new Date(`${monday}T10:00:00Z`) })
      .where(inArray(riders.id, riderIds)),
  );
}
