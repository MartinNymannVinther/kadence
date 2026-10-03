import { eq } from "drizzle-orm";
import { z } from "zod";
import { teamSettings, type TeamSettingsRow } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import {
  DEFAULT_GUIDANCE,
  GUIDANCE_IDS,
  isGuidanceId,
  paradigmFor,
  type GuidanceId,
  type Paradigm,
} from "@/modules/paradigms";
import { requireCoach } from "./access";

/** The team's settings; absent until a coach changes a default. */

export const TeamSettingsInput = z.object({
  teamKind: z.enum(["U17", "U19", "U23", "mixed"]),
  aiOnRiderData: z.boolean(),
  allowYouthWeight: z.boolean(),
  guidance: z.enum(GUIDANCE_IDS as [GuidanceId, ...GuidanceId[]]),
  clubChampionship: z.boolean(),
});

export type TeamSettings = Pick<
  TeamSettingsRow,
  "teamKind" | "aiOnRiderData" | "allowYouthWeight" | "clubChampionship"
> & {
  guidance: GuidanceId;
};

export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  teamKind: "mixed",
  aiOnRiderData: false,
  allowYouthWeight: false,
  guidance: DEFAULT_GUIDANCE,
  clubChampionship: false,
};

export async function getTeamSettings(ctx: OrgContext): Promise<TeamSettings> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(teamSettings)
      .where(eq(teamSettings.orgId, ctx.orgId))
      .limit(1);
    return row
      ? {
          teamKind: row.teamKind,
          aiOnRiderData: row.aiOnRiderData,
          allowYouthWeight: row.allowYouthWeight,
          guidance: isGuidanceId(row.guidance) ? row.guidance : DEFAULT_GUIDANCE,
          clubChampionship: row.clubChampionship,
        }
      : DEFAULT_TEAM_SETTINGS;
  });
}

/**
 * The paradigm the team plans by (docs/adr/0049), read inside a
 * transaction a service already holds; null when the team plans without
 * one. Everyone on the team reads the setting (drizzle/0003).
 */
export async function teamParadigm(tx: AppTransaction, orgId: string): Promise<Paradigm | null> {
  const [row] = await tx
    .select({ guidance: teamSettings.guidance })
    .from(teamSettings)
    .where(eq(teamSettings.orgId, orgId))
    .limit(1);
  const guidance = row && isGuidanceId(row.guidance) ? row.guidance : DEFAULT_GUIDANCE;
  return paradigmFor(guidance);
}

export async function saveTeamSettings(
  ctx: OrgContext,
  input: z.infer<typeof TeamSettingsInput>,
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx
      .insert(teamSettings)
      .values({ orgId: ctx.orgId, ...input, updatedBy: ctx.userId })
      .onConflictDoUpdate({
        target: teamSettings.orgId,
        set: { ...input, updatedBy: ctx.userId },
      });
  });
}
