import { and, eq, gte, isNull, lte, type SQL } from "drizzle-orm";
import { addDaysIso, mondayOf } from "@/core/dates";
import { calendarEvents, workoutTemplates } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { askForJson, modelConfigured, NoModel } from "@/modules/ai/service";
import { isClubWorkspace } from "@/modules/insight/gather";
import type { PlanBasis } from "@/modules/paradigms";
import { requireCoach } from "@/modules/team/access";
import { groupWeekPrompt, type GroupWeekContext } from "./group-week-prompt";
import { dropRaceDaySessions, groupWeekEvents, type ShownEvent } from "./race-week";
import { sanitizeWeekDraft, type WeekDraft } from "./week-draft";
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
 * A group of adults is drafted from their training profile instead, in
 * words of its own (group-week-senior.ts, ADR 0092). In a personal
 * workspace the calendar is the person's own, so their races and other
 * days go along as kind, dates and priority, a race with its title
 * (docs/adr/0101, 0102), and no session is proposed on a race day,
 * whatever the model says.
 */

export { groupWeekPrompt, type GroupWeekContext } from "./group-week-prompt";

/** The proposal, with the calendar days the model read, to show beside it. */
export type GroupWeekProposal = WeekDraft & { events: ShownEvent[] };

/**
 * What a group's week is read from, a coach's: whether the team plans by
 * a paradigm, the calendar days of the week (race-week.ts decides whose)
 * and the team's library.
 */
export async function readGroupWeek(ctx: OrgContext, monday: string) {
  const sunday = addDaysIso(monday, 6);
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const guided = (await teamParadigm(tx, ctx.orgId)) !== null;
    const personal = !(await isClubWorkspace(tx, ctx.orgId));
    // A club's own events only: a rider's exam is that rider's data. In a
    // personal workspace every event is the person's own (docs/adr/0101).
    const whose: SQL[] = personal ? [] : [isNull(calendarEvents.riderId)];
    const rows = await tx
      .select()
      .from(calendarEvents)
      .where(
        and(...whose, lte(calendarEvents.startsOn, sunday), gte(calendarEvents.endsOn, monday)),
      );
    const templates = await tx
      .select()
      .from(workoutTemplates)
      // The team's library; riders' own sessions are theirs (ADR 0050).
      .where(and(eq(workoutTemplates.archived, false), isNull(workoutTemplates.riderId)));
    return { events: groupWeekEvents(rows, personal), templates, guided };
  });
}

export async function proposeGroupWeek(
  ctx: OrgContext,
  input: { monday: string; basis: PlanBasis; text: string },
  locale: string,
): Promise<{ proposal: GroupWeekProposal; engine: string }> {
  const monday = mondayOf(input.monday);
  const { events, templates, guided } = await readGroupWeek(ctx, monday);
  if (!(await modelConfigured(ctx))) throw new NoModel();
  const context: GroupWeekContext = {
    monday,
    guided,
    basis: input.basis,
    wish: input.text,
    events: events.prompt,
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
  const draft = sanitizeWeekDraft(
    data,
    monday,
    templates.map((t) => ({
      id: t.id,
      sport: t.sport,
      structure: t.structure,
      minutes: t.plannedMinutes,
    })),
  );
  const proposal = { ...dropRaceDaySessions(draft, events.prompt), events: events.shown };
  return { proposal, engine };
}
