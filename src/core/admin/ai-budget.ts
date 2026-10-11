import { sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { appDb } from "@/core/db/client";

/**
 * The installation's owner gives a workspace its own monthly AI budget,
 * or takes it back to the installation's default with null (drizzle/0049,
 * docs/adr/0089). The database function set_ai_budget() checks the owner
 * again and is the only way the column can be written: the application
 * role cannot set it on its own, so a coach with the run of
 * team_settings cannot raise their own budget. As platformOverview, it is
 * asked with nothing set but who is asking; the audit trigger on
 * team_settings records the change under the workspace.
 */
export const MAX_BUDGET_MICRO = 100_000 * 1_000_000;

export async function setAiBudget(
  userId: string,
  orgId: string,
  budgetMicro: number | null,
): Promise<"ok" | "unauthorized"> {
  if (!(await isPlatformOwner(userId))) return "unauthorized";
  await appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    await tx.execute(sql`select set_ai_budget(${orgId}, ${budgetMicro})`);
  });
  return "ok";
}
