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
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { asString, list, rec } from "@/modules/ai/sanitize-helpers";
import { askForJson, modelConfigured, NoModel, NotAllowed } from "@/modules/ai/service";
import {
  PHASE_INFO,
  phaseOf,
  RACE_RULES,
  raceRulesFor,
  seasonStartYear,
  strengthFrequency,
  weeklyCorridor,
} from "@/modules/dcu";
import { getInsights } from "@/modules/insight/service";
import { riderClass } from "@/modules/season/class";
import { requireCoach } from "@/modules/team/access";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { readStructure, structureMinutes, type Structure } from "@/modules/workouts/structure";

/**
 * "Foreslå ugen": a draft of next week's sessions for one rider (ADR 0017).
 * The model reads what a coach would look at — DCU's hours and phase for
 * the rider's class, how often strength belongs in the week, the races,
 * exams and camps, what is already planned, the last weeks' hours and the
 * guardrails — and proposes sessions. Bike sessions come back as the
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

type Context = {
  monday: string;
  category: string;
  basis: string | null;
  phase: string;
  corridor: { low: number; target: number; high: number } | null;
  strength: { min: number; max: number };
  planned: Array<{ date: string; sport: string; title: string; minutes: number }>;
  events: Array<{ kind: string; title: string; from: string; to: string; priority: string | null }>;
  recentWeeks: number[];
  flags: string[];
  templates: Array<{ id: string; name: string; sport: string; minutes: number }>;
};

export function weekDraftPrompt(c: Context, locale: string) {
  const system = [
    "You are an experienced Danish youth cycling coach drafting one week of training for one rider, following Cycling Denmark's (DCU) recommendations for the rider's age class.",
    'Answer with one JSON object: {"sessions": [{"date": "YYYY-MM-DD", "sport": "bike"|"strength"|"other", "title": "", "minutes": n, "templateId": "" , "workout": "", "why": ""}], "note": ""}.',
    "For a bike session, write the workout in the coach's shorthand, e.g. '15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel' or '2 t Z2'. Zones: 1 recovery, 2 endurance, 3 tempo, 4 threshold (AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    "For a strength session, use a templateId from the library when one fits (DCU's strength programmes are there); otherwise leave it empty.",
    "Aim the week's bike hours at DCU's target and stay inside its corridor. Follow the phase. Keep strength sessions at least 48 hours apart. Give at least one rest day. Keep the day before an A race easy, and lighten exam days.",
    "Never mention the rider's weight, body or food portions.",
    "Do not repeat sessions already planned. Respect the guardrails: if the rider shows signs of fatigue, pain or poor wellbeing, plan less and say so in the note.",
    "why: one short sentence per session a 16-year-old understands. note: two sentences at most for the coach.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  const user = [
    `Week starting ${c.monday}. Class: ${c.category}${c.basis ? ` (${c.basis})` : ""}. DCU phase: ${c.phase}.`,
    c.corridor
      ? `DCU bike hours this week: target ${c.corridor.target.toFixed(1)}, corridor ${c.corridor.low.toFixed(1)}–${c.corridor.high.toFixed(1)}.`
      : "No DCU hours for this rider's class.",
    raceRulesLine(c.category),
    `Strength this time of year: ${c.strength.min}–${c.strength.max} sessions a week.`,
    `Bike hours the last weeks: ${c.recentWeeks.map((h) => h.toFixed(1)).join(", ") || "none recorded"}.`,
    `Guardrails now: ${c.flags.join(", ") || "none"}.`,
    `Already planned: ${fenceUntrusted(JSON.stringify(c.planned), 2000)}`,
    `Calendar: ${fenceUntrusted(JSON.stringify(c.events), 2000)}`,
    `Library: ${fenceUntrusted(JSON.stringify(c.templates), 3000)}`,
  ].join("\n");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/** DCU's race limits for the class (Sporstlige_regler_2026), as a line of context. */
function raceRulesLine(category: string): string {
  if (category !== "U17" && category !== "U19" && category !== "U23")
    return "No DCU race rules for this class.";
  const r = raceRulesFor(category);
  const parts = [
    r.roadMaxKm !== null ? `road races at most ${r.roadMaxKm} km` : null,
    r.timeTrialMaxKm !== null ? `time trials at most ${r.timeTrialMaxKm} km` : null,
    r.gearingM !== null
      ? `gearing at most ${r.gearingM} m per pedal revolution`
      : "no gearing limit",
    `stage races at most ${r.stageRaceMaxDays} days`,
  ].filter(Boolean);
  return `DCU race rules for ${category}${category === "U19" ? ` (men; women race at most ${RACE_RULES.U19.women.roadMaxKm} km)` : ""}: ${parts.join(", ")}.`;
}

const SPORTS = ["bike", "strength", "other"] as const;

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
      .where(eq(workoutTemplates.archived, false));
    return { rider, planned, events, templates };
  });
  if (!loaded) return null;
  if (!(await modelConfigured(ctx))) throw new NoModel();

  const { rider, planned, events, templates } = loaded;
  const klass = riderClass(rider, seasonStartYear(input.monday));
  const [insight] = await getInsights(ctx, {
    riderIds: [rider.id],
    today: addDaysIso(input.monday, -1),
  });
  const strength = strengthFrequency(input.monday);
  const phase = phaseOf(Number(input.monday.slice(5, 7)));
  const context: Context = {
    monday: input.monday,
    category: klass.category,
    basis: klass.basis,
    phase: `${phase} — ${PHASE_INFO[phase].description}`,
    corridor: klass.basis ? weeklyCorridor(klass.basis, input.monday) : null,
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
    flags: (insight?.flags ?? []).map((f) => f.kind),
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
  return { proposal: draft, engine };
}
