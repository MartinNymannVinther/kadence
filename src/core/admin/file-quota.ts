import { sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { appDb } from "@/core/db/client";

/**
 * The installation's owner gives a workspace its own file quota, or takes
 * it back to the installation's default with null (drizzle/0051,
 * docs/adr/0087). As with the AI budget (ai-budget.ts), the database
 * function set_file_quota() checks the owner again and is the only way
 * the column can be written: the guard trigger refuses the application
 * role, so a coach with the run of team_settings cannot raise their own
 * quota. The audit trigger on team_settings records the change under the
 * workspace.
 */
export const MAX_QUOTA_BYTES = 100 * 1000 ** 4;

export async function setFileQuota(
  userId: string,
  orgId: string,
  quotaBytes: number | null,
): Promise<"ok" | "unauthorized"> {
  if (!(await isPlatformOwner(userId))) return "unauthorized";
  await appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    await tx.execute(sql`select set_file_quota(${orgId}, ${quotaBytes})`);
  });
  return "ok";
}
