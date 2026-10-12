import { Refused } from "@/core/action";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import { PLAN_EXPIRED, planIn, planExpired } from "./state";

export { billingOn, PLAN_EXPIRED, planExpired, workspacePlan, type WorkspacePlan } from "./state";

/**
 * Read and export (docs/adr/0090): a workspace whose trial or payment has
 * run out keeps everything it holds and shows it, and takes nothing new
 * in. The refusal is one shape everywhere, `Refused("forbidden",
 * "planExpired")`, which the pages word as "Abonnementet er udløbet" and
 * which the file doors answer as they answer a full quota.
 *
 * Where it is asked:
 * - every server action, in `runAction` (src/core/action.ts), except the
 *   few that pass `STILL_ALLOWED`: reading, leaving, taking away;
 * - every door a ride comes in by, inside the import (`assertWritableIn`
 *   in src/modules/devices/import.ts), so the upload, an upload key, a
 *   Strava archive, a share, Rulle and a device's job all refuse alike;
 * - every call to a model, in the AI's one door (src/modules/ai/limits.ts).
 */

/** Refuses a write for a workspace that may only be read. */
export async function requireWritable(ctx: OrgContext): Promise<void> {
  if (await planExpired(ctx)) throw new Refused("forbidden", PLAN_EXPIRED);
}

/** The same, inside a transaction that already carries the workspace's context. */
export async function assertWritableIn(tx: AppTransaction, orgId: string): Promise<void> {
  if ((await planIn(tx, orgId)).plan === "expired") throw new Refused("forbidden", PLAN_EXPIRED);
}

/** Whether a refusal is the plan's: the doors answer it as "read only", not "a bad file". */
export function isPlanRefusal(error: unknown): boolean {
  return error instanceof Refused && error.detail === PLAN_EXPIRED;
}
