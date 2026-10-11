import { and, eq } from "drizzle-orm";
import { pushSubscriptions } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { errorName, log } from "@/core/log";

/**
 * A person's reminders on a team go with them when they leave (docs/adr/
 * 0060). The row is theirs alone, so it is deleted as them, and the team
 * keeps nothing. Best effort: leaving has already happened.
 */
export async function forgetReminders(ctx: OrgContext): Promise<void> {
  try {
    await withOrgContext(ctx, (tx) =>
      tx
        .delete(pushSubscriptions)
        .where(
          and(eq(pushSubscriptions.orgId, ctx.orgId), eq(pushSubscriptions.userId, ctx.userId)),
        ),
    );
  } catch (error) {
    await log.error("team: forgetting reminders after leaving failed", {
      orgId: ctx.orgId,
      error: errorName(error),
    });
  }
}
