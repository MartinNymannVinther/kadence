import { eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { SENIOR_PROFILES } from "@/modules/paradigms";
import { whoAmIIn } from "./access";

/**
 * A senior's training profile, Motionist or Supermotionist
 * (docs/adr/0091): a coach chooses it for any rider on the team, and a
 * rider for themselves, as with thresholds — the riders guard
 * (drizzle/0018) leaves the column to the rider. Null puts the rider back
 * on the default, motionist. The profile is read only while the rider's
 * class is senior; the choice is kept if a coach moves the rider back.
 */

export const TrainingProfileInput = z.object({
  riderId: z.string().min(1).max(100),
  profile: z.enum(SENIOR_PROFILES).nullable(),
});

export async function setTrainingProfile(
  ctx: OrgContext,
  input: z.infer<typeof TrainingProfileInput>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me || (!me.isCoach && me.rider?.id !== input.riderId)) throw new Refused("forbidden");
    const rows = await tx
      .update(riders)
      .set({ trainingProfile: input.profile })
      .where(eq(riders.id, input.riderId))
      .returning({ id: riders.id });
    if (rows.length === 0) throw new Refused("notFound");
  });
}
