import { eq } from "drizzle-orm";
import { todayInCopenhagen } from "@/core/dates";
import { riders } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { seasonStartYear } from "@/modules/dcu";
import { riderClass } from "./class";

/**
 * Whether a workspace has an adult — a rider past U23 this season — so
 * Kadence's sessions, programmes and weeks for a training profile are
 * offered there (docs/adr/0092) and stay out of a youth team's way. Reads
 * the riders the caller may read, under RLS: a coach sees the team.
 */
export async function seniorIn(tx: AppTransaction, today = todayInCopenhagen()): Promise<boolean> {
  const season = seasonStartYear(today);
  const team = await tx
    .select({
      birthYear: riders.birthYear,
      categoryOverride: riders.categoryOverride,
      trainingProfile: riders.trainingProfile,
    })
    .from(riders)
    .where(eq(riders.archived, false));
  return team.some((r) => riderClass(r, season).category === "senior");
}

export async function hasSeniorRider(ctx: OrgContext): Promise<boolean> {
  return withOrgContext(ctx, (tx) => seniorIn(tx));
}
