import { eq } from "drizzle-orm";
import { todayInCopenhagen } from "@/core/dates";
import { riders, teamSettings } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireGarminAi } from "@/modules/ai/garmin-gate";
import { askForJson, NotAllowed } from "@/modules/ai/service";
import { getInsights } from "@/modules/insight/service";
import { requireWriteFor, whoAmIIn } from "@/modules/team/access";
import { listGoals } from "@/modules/training/goals";
import { getRiderRecords } from "@/modules/training/records";
import { formStoryContext } from "./form-story-context";
import { formStoryPrompt, sanitizeStory } from "./form-story-prompt";

/**
 * "Forklar formen med AI" under the form chart (docs/adr/0109): a prose
 * reading of what the curve says and what else Kadence knows about the
 * rider's training — the weeks, the thresholds, the records, the goals —
 * written to the rider, or about them to their coach. A read: nothing is
 * written, nothing is saved (dogma five).
 *
 * Who may ask is who may write on the rider's training — a coach for
 * their rider, a rider for themselves — and only where the AI may read
 * riders' data (team_settings.ai_on_rider_data, ADR 0017, 0080), the
 * rule the session comment follows (ADR 0095). Counted against the
 * ceilings and the month's budget like every call (`askForJson`).
 */

export type FormStory = { story: string };

export async function proposeFormStory(
  ctx: OrgContext,
  input: { riderId: string },
  locale: string,
): Promise<{ proposal: FormStory; engine: string } | null> {
  const loaded = await withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    const [settings] = await tx
      .select({ allowed: teamSettings.aiOnRiderData })
      .from(teamSettings)
      .where(eq(teamSettings.orgId, ctx.orgId));
    if (!settings?.allowed) throw new NotAllowed();
    const [rider] = await tx.select().from(riders).where(eq(riders.id, input.riderId));
    if (!rider) return null;
    await requireGarminAi(tx, rider.id);
    const me = await whoAmIIn(tx, ctx);
    return { rider, own: me?.rider?.id === rider.id };
  });
  if (!loaded) return null;
  const today = todayInCopenhagen();
  const [insights, records, goals] = await Promise.all([
    getInsights(ctx, { riderIds: [loaded.rider.id], today }),
    getRiderRecords(ctx, loaded.rider.id, { today }),
    listGoals(ctx, loaded.rider.id, today),
  ]);
  const insight = insights[0];
  if (!insight) return null;
  const context = formStoryContext({
    rider: loaded.rider,
    insight,
    records,
    goals,
    today,
    reader: loaded.own
      ? { kind: "rider" }
      : { kind: "coach", firstName: loaded.rider.name.split(" ")[0] ?? "" },
  });
  const { data, engine } = await askForJson(ctx, "form_story", formStoryPrompt(context, locale), {
    maxTokens: 1200,
  });
  return { proposal: { story: sanitizeStory(data) }, engine };
}
