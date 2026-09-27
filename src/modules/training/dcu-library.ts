import { and, eq } from "drizzle-orm";
import { workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { STRENGTH_PROGRAMMES } from "@/modules/dcu";
import { requireCoach } from "@/modules/team/access";
import { structureMinutes } from "@/modules/workouts/structure";

/**
 * DCU's strength programmes into the team's library (ADR 0014), as
 * templates marked `source = dcu` with a stable key. Installing again
 * brings an existing one up to the edition in `src/modules/dcu` rather than
 * adding a second; a coach who wants to change one duplicates it first.
 * The names follow the team's language choice at the time of installing.
 */
export async function installDcuProgrammes(
  ctx: OrgContext,
  locale: "da" | "en",
): Promise<{ installed: number; updated: number }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    let installed = 0;
    let updated = 0;
    for (const programme of Object.values(STRENGTH_PROGRAMMES)) {
      const values = {
        name: programme.name[locale],
        sport: "strength",
        description: programme.source,
        structure: programme.structure,
        plannedMinutes: structureMinutes(programme.structure),
        source: "dcu",
        sourceKey: programme.key,
      };
      const rows = await tx
        .update(workoutTemplates)
        .set(values)
        .where(
          and(eq(workoutTemplates.orgId, ctx.orgId), eq(workoutTemplates.sourceKey, programme.key)),
        )
        .returning({ id: workoutTemplates.id });
      if (rows.length > 0) {
        updated += 1;
        continue;
      }
      await tx
        .insert(workoutTemplates)
        .values({ orgId: ctx.orgId, ...values, createdBy: ctx.userId });
      installed += 1;
    }
    return { installed, updated };
  });
}
