import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { addDaysIso, mondayOf } from "@/core/dates";
import { calendarEvents, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { askForJson, modelConfigured, NoModel } from "@/modules/ai/service";
import {
  PHASE_INFO,
  phaseOf,
  strengthFrequency,
  weeklyCorridor,
  type ClassBasis,
} from "@/modules/dcu";
import { requireCoach } from "@/modules/team/access";
import { raceRulesLine, sanitizeWeekDraft, type WeekDraft } from "./week-draft";
import { teamParadigm } from "@/modules/team/settings";

/**
 * "Foreslå ugen for gruppen" (ADR 0043): a draft of one week for a group
 * of riders, read from what the team owns and DCU says — the class-year
 * the coach chose, its hours and phase, strength this time of year, the
 * team's own events and library, and the coach's words. No rider's data
 * goes in: no hours ridden, no check-ins, no flags. So the team's switch
 * for riders' data (ADR 0017) is not asked; the per-rider draft still is.
 * The answer goes through the per-rider draft's sanitizer, and lands in
 * the week planner, where the coach changes it before anything is made.
 */

type Context = {
  monday: string;
  /** Whether the team plans by DCU (ADR 0049). */
  guided: boolean;
  basis: ClassBasis;
  wish: string;
  events: Array<{ kind: string; title: string; from: string; to: string; priority: string | null }>;
  templates: Array<{ id: string; name: string; sport: string; minutes: number }>;
};

export function groupWeekPrompt(c: Context, locale: string) {
  const category = c.basis.split("-")[0]!;
  const corridor = weeklyCorridor(c.basis, c.monday);
  const strength = strengthFrequency(c.monday);
  const phase = phaseOf(Number(c.monday.slice(5, 7)));
  const system = [
    c.guided
      ? "You are an experienced Danish youth cycling coach drafting one week of training for a group of riders of the same class, following Cycling Denmark's (DCU) recommendations for the class."
      : "You are an experienced Danish youth cycling coach drafting one week of training for a group of riders of the same class.",
    'Answer with one JSON object: {"sessions": [{"date": "YYYY-MM-DD", "sport": "bike"|"strength"|"other", "title": "", "minutes": n, "templateId": "", "workout": "", "why": ""}], "note": ""}.',
    "For a bike session, write the workout in the coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel' or '2 t Z2'. Zones: 1 recovery, 2 endurance, 3 tempo, 4 threshold (AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    "For a strength session, use a templateId from the library when one fits (DCU's strength programmes are there); otherwise leave it empty.",
    c.guided
      ? "Aim the week's bike hours at DCU's target and stay inside its corridor. Follow the phase. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy."
      : "The team plans without a federation's hour model (ADR 0049): plan the hours the coach asks for, rising at most 15 % from last week. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy.",
    c.guided
      ? "Follow the coach's wishes for the week where they fit DCU's frame; where they do not, follow DCU and say so in the note."
      : "Follow the coach's wishes for the week.",
    "Never mention the riders' weight, bodies or food portions.",
    "why: one short sentence per session a 16-year-old understands. note: two sentences at most for the coach.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = [
    c.guided
      ? `Week starting ${c.monday}. Class: ${category} (${c.basis}). DCU phase: ${phase} — ${PHASE_INFO[phase].description}.`
      : `Week starting ${c.monday}. Class: ${category}.`,
    !c.guided
      ? "The team sets its own hours."
      : corridor.target > 0
        ? `DCU bike hours this week: target ${corridor.target.toFixed(1)}, corridor ${corridor.low.toFixed(1)}–${corridor.high.toFixed(1)}.`
        : "DCU's October: break and free riding, no set hours.",
    raceRulesLine(category),
    `Strength this time of year: ${strength.perWeekMin}–${strength.perWeekMax} sessions a week.`,
    `The coach's wishes for the week: ${fenceUntrusted(c.wish || "none", 600)}`,
    `The team's calendar: ${fenceUntrusted(JSON.stringify(c.events), 2000)}`,
    `Library: ${fenceUntrusted(JSON.stringify(c.templates), 3000)}`,
  ].join("\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export async function proposeGroupWeek(
  ctx: OrgContext,
  input: { monday: string; basis: ClassBasis; text: string },
  locale: string,
): Promise<{ proposal: WeekDraft; engine: string }> {
  const monday = mondayOf(input.monday);
  const sunday = addDaysIso(monday, 6);
  const { events, templates, guided } = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const guided = (await teamParadigm(tx, ctx.orgId)) !== null;
    // The team's own events only: a rider's exam is that rider's data.
    const events = await tx
      .select()
      .from(calendarEvents)
      .where(
        and(
          isNull(calendarEvents.riderId),
          lte(calendarEvents.startsOn, sunday),
          gte(calendarEvents.endsOn, monday),
        ),
      );
    const templates = await tx
      .select()
      .from(workoutTemplates)
      // The team's library; riders' own sessions are theirs (ADR 0050).
      .where(and(eq(workoutTemplates.archived, false), isNull(workoutTemplates.riderId)));
    return { events, templates, guided };
  });
  if (!(await modelConfigured(ctx))) throw new NoModel();
  const context: Context = {
    monday,
    guided,
    basis: input.basis,
    wish: input.text,
    events: events.map((e) => ({
      kind: e.kind,
      title: e.title,
      from: e.startsOn,
      to: e.endsOn,
      priority: e.priority,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      minutes: t.plannedMinutes,
    })),
  };
  const { data, engine } = await askForJson(ctx, "group_week", groupWeekPrompt(context, locale), {
    maxTokens: 2500,
  });
  const proposal = sanitizeWeekDraft(
    data,
    monday,
    templates.map((t) => ({
      id: t.id,
      sport: t.sport,
      structure: t.structure,
      minutes: t.plannedMinutes,
    })),
  );
  return { proposal, engine };
}
