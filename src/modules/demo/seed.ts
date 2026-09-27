import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { raceYearOf, seasonStartYear, strengthFrequency } from "@/modules/dcu";
import { createSeasonPlan } from "@/modules/season/plans";
import { createRider, setThresholds } from "@/modules/team/riders";
import { saveTeamSettings } from "@/modules/team/settings";
import { addComment } from "@/modules/training/comments";
import { completeSession } from "@/modules/training/complete";
import { installDcuProgrammes } from "@/modules/training/dcu-library";
import { createEvent } from "@/modules/training/events";
import { scheduleTemplate } from "@/modules/training/group";
import { listSessions } from "@/modules/training/sessions";
import { createTemplate, listTemplates } from "@/modules/training/templates";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { COMMENTS, EVENTS, EXAM, NOTES, pick, RIDERS, TEMPLATES, type L } from "./seed-data";

export type { L };

/**
 * A U19 team in full swing for the demo (ADR 0005): six made-up riders
 * with thresholds and a season plan from DCU, the coach's library beside
 * DCU's strength programme, six weeks of group plans that were mostly
 * ridden (a few missed, as in life), next week planned, a fortnight of
 * check-ins with one rider tired and one with a sore knee, races and a
 * camp ahead, an exam, and a couple of comments. Written through the
 * ordinary services, as the demo's coach, so what the visitor sees is what
 * the product does with real rows.
 */

const WEEKS_BACK = 6;

/** A small deterministic generator, so every demo tells the same story. */
function random(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

export async function seedDemoTeam(ctx: OrgContext, l: L, now = new Date()): Promise<void> {
  const today = todayInCopenhagen(now);
  const season = seasonStartYear(today);
  const raceYear = raceYearOf(season);
  const rnd = random(7);

  await saveTeamSettings(ctx, { teamKind: "U19", aiOnRiderData: false, allowYouthWeight: false });
  await installDcuProgrammes(ctx, l);

  const templates: Record<string, string> = {};
  for (const t of TEMPLATES) {
    const structure = parseWorkoutText(t.text)!;
    const { id } = await createTemplate(ctx, {
      name: pick(t.name, l),
      sport: "bike",
      description: t.text,
      structure,
      plannedMinutes: 0,
    });
    templates[t.text] = id;
  }
  const strength = (await listTemplates(ctx)).find((t) => t.sourceKey === "dcu-strength-u19-2016");

  const riderIds: string[] = [];
  for (const r of RIDERS) {
    const birthYear = raceYear - (16 + r.u19Year);
    const { id } = await createRider(ctx, {
      name: r.name,
      birthYear,
      sex: r.sex,
      categoryOverride: null,
    });
    await setThresholds(ctx, id, {
      ftpWatts: r.ftp,
      thresholdHr: r.thr,
      maxHr: r.thr + 18,
      restingHr: 48,
      thresholdsOn: addDaysIso(today, -40),
    });
    await createSeasonPlan(ctx, id, season).catch(() => undefined);
    riderIds.push(id);
  }

  const byText = (text: string) => templates[text]!;
  const week = [
    { day: 1, template: byText(TEMPLATES[1]!.text) },
    { day: 2, template: byText(TEMPLATES[0]!.text) },
    { day: 3, template: byText(TEMPLATES[5]!.text) },
    { day: 5, template: byText(TEMPLATES[0]!.text) },
    { day: 6, template: byText(TEMPLATES[3]!.text) },
  ];
  const firstMonday = addDaysIso(mondayOf(today), -7 * WEEKS_BACK);
  for (let w = 0; w <= WEEKS_BACK + 1; w++) {
    const monday = addDaysIso(firstMonday, 7 * w);
    for (const [i, slot] of week.entries()) {
      const template = w % 2 === 1 && i === 0 ? byText(TEMPLATES[2]!.text) : slot.template;
      await scheduleTemplate(ctx, template, riderIds, addDaysIso(monday, slot.day));
    }
    if (strength) {
      const perWeek = strengthFrequency(monday).perWeekMin;
      for (let s = 0; s < perWeek; s++)
        await scheduleTemplate(ctx, strength.id, riderIds, addDaysIso(monday, s === 0 ? 0 : 3));
    }
  }

  // What was ridden: most sessions, a little shorter or longer, a few missed.
  const past = await listSessions(ctx, { from: firstMonday, to: addDaysIso(today, -1) });
  for (const s of past) {
    if (rnd() < 0.1) continue;
    const factor = 0.85 + rnd() * 0.25;
    const base =
      s.sport === "strength" ? 6 : s.title.includes("VO2") ? 8 : s.title.includes("AT") ? 7 : 3;
    await completeSession(ctx, s.id, {
      minutes: Math.max(20, Math.round(s.plannedMinutes * factor)),
      distanceKm:
        s.sport === "bike" ? Math.round((s.plannedMinutes / 60) * (28 + rnd() * 6)) : null,
      rpe: Math.min(10, Math.max(1, base + (rnd() < 0.3 ? 1 : 0))),
      feel: 3 + (rnd() < 0.5 ? 1 : 0),
      note: "",
    });
  }

  for (const [i, riderId] of riderIds.entries()) {
    for (let d = 13; d >= 0; d--) {
      const tired = i === 1 && d < 6;
      const knee = i === 3 && d < 3;
      await saveCheckin(ctx, {
        riderId,
        onDate: addDaysIso(today, -d),
        sleepHours: tired ? 6.5 : 8 + Math.round(rnd() * 10) / 10,
        sleepQuality: tired ? 2 : 4,
        energy: tired ? 2 : 3 + (rnd() < 0.5 ? 1 : 0),
        mood: tired ? 3 : 4,
        soreness: tired ? 2 : 4,
        stress: i === 2 && d < 4 ? 2 : 4,
        pain: knee ? 2 : 0,
        painWhere: knee ? pick({ da: "Højre knæ", en: "Right knee" }, l) : "",
        ill: 0,
        note:
          tired && d === 0 ? pick(NOTES.soreLegs, l) : knee && d === 0 ? pick(NOTES.knee, l) : "",
      });
    }
  }

  for (const e of EVENTS)
    await createEvent(ctx, {
      riderId: null,
      kind: e.kind,
      title: pick(e.title, l),
      startsOn: addDaysIso(today, e.inDays),
      endsOn: addDaysIso(today, e.inDays + e.days - 1),
      priority: e.priority,
      note: "",
    });
  await createEvent(ctx, {
    riderId: riderIds[2]!,
    kind: "exam",
    title: pick(EXAM, l),
    startsOn: addDaysIso(today, 3),
    endsOn: addDaysIso(today, 3),
    priority: null,
    note: "",
  });

  const recent = past.filter((s) => s.onDate >= addDaysIso(today, -7));
  for (const [i, c] of COMMENTS.entries()) {
    const session = recent[i * 7];
    if (session) await addComment(ctx, { plannedSessionId: session.id }, pick(c.coach, l));
  }
}
