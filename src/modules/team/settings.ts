import { eq } from "drizzle-orm";
import { z } from "zod";
import { teamSettings, type TeamSettingsRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireCoach } from "./access";

/** The team's settings; absent until a coach changes a default. */

export const TeamSettingsInput = z.object({
  teamKind: z.enum(["U17", "U19", "U23", "mixed"]),
  aiOnRiderData: z.boolean(),
  allowYouthWeight: z.boolean(),
});

export type TeamSettings = Pick<TeamSettingsRow, "teamKind" | "aiOnRiderData" | "allowYouthWeight">;

export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  teamKind: "mixed",
  aiOnRiderData: false,
  allowYouthWeight: false,
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
        }
      : DEFAULT_TEAM_SETTINGS;
  });
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
