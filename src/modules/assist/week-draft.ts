import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import { addDaysIso } from "@/core/dates";
import {
  calendarEvents,
  plannedSessions,
  riders,
  teamSettings,
  workoutTemplates,
} from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { asString, list, rec } from "@/modules/ai/sanitize-helpers";
import { askForJson, modelConfigured, NoModel, NotAllowed } from "@/modules/ai/service";
import { PHASE_INFO, phaseOf, seasonStartYear, strengthFrequency } from "@/modules/dcu";
import { isGuidanceId, isSeniorBasis, paradigmFor, profileOf } from "@/modules/paradigms";
import type { RiderInsight } from "@/modules/insight/rider";
import { getInsights } from "@/modules/insight/service";
import { riderClass } from "@/modules/season/class";
import { requireCoach } from "@/modules/team/access";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { layRacePrep, settleRaceDays } from "./race-week";
import { weekDraftPrompt, type WeekDraftContext } from "./week-draft-prompt";
import { readStructure, structureMinutes, type Structure } from "@/modules/workouts/structure";

/**
 * "Foreslå ugen": a draft of next week's sessions for one rider (ADR 0017).
 * The model reads what a coach would look at — DCU's hours and phase for
 * the rider's class, how often strength belongs in the week, the races,
 * exams and camps, what is already planned, the last weeks' hours and the
 * guardrails — and proposes sessions. A senior is drafted from their
 * training profile instead, Kadence's own hours (docs/adr/0091), as an
 * adult rather than a youth rider. Bike sessions come back as the
 * coach's own shorthand and are read by the same rules the coach's typing
 * is (parse-text.ts), so a proposal is always a session the builder can
 * show. A read: the coach takes each session or leaves it; nothing is
 * written here. The AI reads a rider's data only where the team has said
 * yes (team_settings.ai_on_rider_data).
 */

export type DraftSession = {
  date: string;
  sport: "bike" | "strength" | "other";
  title: string;
  minutes: number;
  templateId: string | null;
  structure: Structure;
  why: string;
};

export type WeekDraft = { sessions: DraftSession[]; note: string };

export { raceRulesLine, weekDraftPrompt, type WeekDraftContext } from "./week-draft-prompt";

const SPORTS = ["bike", "strength", "other"] as const;

/**
 * Every flag the week raised, afklaret or not: the draft plans load, and
 * a pain the coach has talked about is still a pain to plan around (ADR
 * 0026). The brief and the tips ask "who needs my attention" and see open
 * flags only; the draft asks "how much can this rider do".
 */
export function draftFlagKinds(
  insight: Pick<RiderInsight, "flags" | "resolved"> | undefined,
): string[] {
  if (!insight) return [];
  return [...insight.flags, ...insight.resolved.map((r) => r.flag)].map((f) => f.kind);
}

/** The model's week, made safe: dates in the week, known sports and templates, real sessions. */
export function sanitizeWeekDraft(
  data: unknown,
  monday: string,
  templates: Array<{ id: string; sport: string; structure: unknown; minutes: number }>,
): WeekDraft {
  const days = new Set(Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i)));
  const sessions: DraftSession[] = [];
  for (const item of list(rec(data).sessions).slice(0, 14)) {
    const date = asString(item.date, "", 10);
    const sport = asString(item.sport, "", 10) as DraftSession["sport"];
    if (!days.has(date) || !SPORTS.includes(sport)) continue;
    const template = templates.find(
      (t) => t.id === asString(item.templateId, "", 100) && t.sport === sport,
    );
    const minutes = Math.max(0, Math.min(360, Math.round(Number(item.minutes) || 0)));
    let structure: Structure | null = null;
    if (template) structure = readStructure(template.structure, sport);
    else if (sport === "bike") structure = parseWorkoutText(asString(item.workout, "", 500));
    if (!structure && sport === "bike" && minutes > 0)
      structure = {
        kind: "bike",
        steps: [
          {
            kind: "step",
            intent: "steady",
            seconds: minutes * 60,
            target: { kind: "zone", zone: 2 },
          },
        ],
      };
    if (!structure)
      structure = readStructure({ text: asString(item.workout, "", 500), minutes }, sport);
    const total = structureMinutes(structure) || minutes || template?.minutes || 0;
    if (total <= 0) continue;
    sessions.push({
      date,
      sport,
      title: asString(item.title, sport, 120) || sport,
      minutes: total,
      templateId: template?.id ?? null,
      structure,
      why: asString(item.why, "", 300),
    });
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return { sessions, note: asString(rec(data).note, "", 600) };
}

export async function proposeWeek(
  ctx: OrgContext,
  input: { riderId: string; monday: string },
  locale: string,
): Promise<{ proposal: WeekDraft; engine: string } | null> {
  const loaded = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    const [settings] = await tx
      .select()
      .from(teamSettings)
      .where(eq(teamSettings.orgId, ctx.orgId));
    if (!settings?.aiOnRiderData) throw new NotAllowed();
    const [rider] = await tx.select().from(riders).where(eq(riders.id, input.riderId));
    if (!rider) return null;
    const sunday = addDaysIso(input.monday, 6);
    const planned = await tx
      .select()
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.riderId, rider.id),
          gte(plannedSessions.onDate, input.monday),
          lte(plannedSessions.onDate, sunday),
        ),
      );
    const events = await tx
      .select()
      .from(calendarEvents)
      .where(
        and(
          or(isNull(calendarEvents.riderId), eq(calendarEvents.riderId, rider.id)),
          lte(calendarEvents.startsOn, sunday),
          gte(calendarEvents.endsOn, input.monday),
        ),
      );
    const templates = await tx
      .select()
      .from(workoutTemplates)
      // The team's library; riders' own sessions are theirs (ADR 0050).
      .where(and(eq(workoutTemplates.archived, false), isNull(workoutTemplates.riderId)));
    return { rider, planned, events, templates, guidance: settings.guidance };
  });
  if (!loaded) return null;
  if (!(await modelConfigured(ctx))) throw new NoModel();

  const { rider, planned, events, templates } = loaded;
  const klass = riderClass(rider, seasonStartYear(input.monday));
  const [insight] = await getInsights(ctx, {
    riderIds: [rider.id],
    today: addDaysIso(input.monday, -1),
  });
  const paradigm = paradigmFor(isGuidanceId(loaded.guidance) ? loaded.guidance : "dcu-2025");
  const guided = paradigm !== null;
  const strength = paradigm
    ? paradigm.strengthFrequency(klass.basis, input.monday)
    : strengthFrequency(input.monday);
  const phase = phaseOf(Number(input.monday.slice(5, 7)));
  const month = Number(input.monday.slice(5, 7));
  const context: WeekDraftContext = {
    monday: input.monday,
    guided,
    category: klass.category,
    basis: klass.basis,
    phase: `${phase} — ${PHASE_INFO[phase].description}`,
    corridor: paradigm && klass.basis ? paradigm.weeklyCorridor(klass.basis, input.monday) : null,
    senior:
      paradigm && isSeniorBasis(klass.basis)
        ? { profile: profileOf(klass.basis), monthHours: paradigm.monthHours(klass.basis, month) }
        : null,
    strength: { min: strength.perWeekMin, max: strength.perWeekMax },
    planned: planned.map((p) => ({
      date: p.onDate,
      sport: p.sport,
      title: p.title,
      minutes: p.plannedMinutes,
    })),
    events: events.map((e) => ({
      kind: e.kind,
      title: e.title,
      from: e.startsOn,
      to: e.endsOn,
      priority: e.priority,
    })),
    recentWeeks: (insight?.weeks ?? []).slice(-4).map((w) => w.bikeHours),
    flags: draftFlagKinds(insight),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      minutes: t.plannedMinutes,
    })),
  };
  const { data, engine } = await askForJson(ctx, "week_draft", weekDraftPrompt(context, locale), {
    maxTokens: 2500,
  });
  const draft = sanitizeWeekDraft(
    data,
    input.monday,
    templates.map((t) => ({
      id: t.id,
      sport: t.sport,
      structure: t.structure,
      minutes: t.plannedMinutes,
    })),
  );
  // A race day holds the race and its eve the race prep, whatever the model
  // said (docs/adr/0103, 0106).
  const raced = settleRaceDays(draft, context.events);
  return { proposal: layRacePrep(raced, context.events, input.monday, locale), engine };
}
