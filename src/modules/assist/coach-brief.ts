import { eq } from "drizzle-orm";
import { teamSettings } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { DATA_RULE, languageRule } from "@/modules/ai/prompting";
import { asString, rec } from "@/modules/ai/sanitize-helpers";
import { askForJson, modelConfigured, NotAllowed } from "@/modules/ai/service";
import type { Flag } from "@/modules/load";
import { getInsights } from "@/modules/insight/service";
import { requireCoach } from "@/modules/team/access";

/**
 * "Mandagsoverblikket" (ADR 0017): who on the team needs the coach's
 * attention this week, and why. The list itself is not the AI's — it is
 * the guardrails and wellbeing the insight computes, the same numbers the
 * coach sees on each rider — so it works with no model at all. With a
 * model, and only where the team lets the AI read riders' data, the model
 * writes a few sentences on top: which conversations to have first. It
 * never writes to a rider.
 */

export type BriefRider = { riderId: string; name: string; flags: Flag[] };
export type CoachBrief = { riders: BriefRider[]; summary: string | null };

export function briefPrompt(riders: BriefRider[], locale: string) {
  const system = [
    "You help a volunteer youth cycling coach start the week. You get, per rider, the guardrail flags a training system raised (kind, severity, values).",
    'Answer with one JSON object: {"summary": ""}. Three to five short sentences: who to talk to first and why, and one thing that is going well if the data shows it.',
    "Do not diagnose, do not give medical advice, and never suggest pushing through pain or poor wellbeing — suggest a conversation, and professional help when a flag says help.",
    "Never comment on a rider's weight, body, food or portions: Team Danmark advises against it, and comments on weight are a known trigger of eating disorders in young athletes.",
    "Write as a helpful colleague who respects that the coach knows the riders and decides: offer possibilities rather than orders, and say things plainly and positively rather than as negations.",
    "Use the riders' first names. Do not invent anything the flags do not say.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = JSON.stringify(
    riders.map((r) => ({ name: r.name.split(" ")[0], flags: r.flags })),
  ).slice(0, 6000);
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: `<data>\n${user}\n</data>` },
  ];
}

export async function buildCoachBrief(
  ctx: OrgContext,
  locale: string,
  options: { withSummary: boolean; today?: string },
): Promise<{ proposal: CoachBrief; engine: string }> {
  const allowed = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [settings] = await tx
      .select()
      .from(teamSettings)
      .where(eq(teamSettings.orgId, ctx.orgId));
    return settings?.aiOnRiderData ?? false;
  });
  const insights = await getInsights(ctx, { today: options.today });
  const riders = insights
    .filter((i) => i.flags.length > 0)
    .map((i) => ({ riderId: i.riderId, name: i.name, flags: i.flags }));
  if (!options.withSummary || riders.length === 0)
    return { proposal: { riders, summary: null }, engine: "none" };
  if (!allowed) throw new NotAllowed();
  if (!(await modelConfigured(ctx))) return { proposal: { riders, summary: null }, engine: "none" };
  const { data, engine } = await askForJson(ctx, "coach_brief", briefPrompt(riders, locale), {
    maxTokens: 700,
  });
  return { proposal: { riders, summary: asString(rec(data).summary, "", 1200) || null }, engine };
}
