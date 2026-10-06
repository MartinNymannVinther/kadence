import { addDaysIso, diffDays, mondayOf, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { phaseOf, raceYearOf, seasonStartYear, strengthFrequency } from "@/modules/dcu";
import { createSeasonPlan } from "@/modules/season/plans";
import { createRider, setThresholds } from "@/modules/team/riders";
import { saveTeamSettings } from "@/modules/team/settings";
import { importFit } from "@/modules/devices/import";
import { addComment } from "@/modules/training/comments";
import { completeSession } from "@/modules/training/complete";
import { installDcuProgrammes } from "@/modules/training/dcu-library";
import { createBlock } from "@/modules/training/blocks";
import { addDcuWinterGoal } from "@/modules/training/goals";
import { createEvent } from "@/modules/training/events";
import { scheduleTemplate } from "@/modules/training/group";
import { listSessions } from "@/modules/training/sessions";
import { createTemplate, listTemplates } from "@/modules/training/templates";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { kindOf, rideFit, routeFor } from "./rides";
import type { DemoRider } from "./club";
import { seedShowcase } from "./showcase";
import { sampleRideFit } from "./sample-ride";
import { COMMENTS, EVENTS, EXAM, NOTES, pick, RIDERS, TEMPLATES, type L } from "./seed-data";

export type { L };

/**
 * A U19 team in full swing for the demo (ADR 0005): six made-up riders
 * with thresholds and a season plan from DCU, the coach's library beside
 * DCU's strength programme, six weeks of group plans that were mostly
 * ridden (a few missed, as in life), next week planned, a fortnight of
 * check-ins with one rider tired and one with a sore knee, races and a
 * camp ahead, an exam, and a couple of comments. The last weeks' rides
 * come in as real FIT files — routes round Østjylland, watt and pulse at
 * each rider's own threshold (`rides.ts`) — so the calendar, the records
 * and every activity page show what an upload gives; one long ride with a
 * coffee stop is the showcase. The rest of the product comes after
 * (showcase.ts): the club's logo and picture, a rider's own session, the
 * club championship and Trænerrummet's example threads. Written through
 * the ordinary services, as the demo's coach, so what the visitor sees is
 * what the product does with real rows.
 */

const WEEKS_BACK = 6;
/** The weeks whose rides are real files; earlier ones are ticked off by hand. */
const RIDE_WEEKS = 3;

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

  await saveTeamSettings(ctx, {
    teamKind: "U19",
    aiOnRiderData: false,
    allowYouthWeight: false,
    guidance: "dcu-2025",
    // On in the demo so a visitor sees them; off for a new team (ADR 0051, 0053).
    clubChampionship: true,
    lowIntensityFirst: true,
  });
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
  const riders: DemoRider[] = [];
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
    await addDcuWinterGoal(
      ctx,
      id,
      pick({ da: "DCU: 30 styrkepas i vinter", en: "DCU: 30 strength sessions this winter" }, l),
    );
    riderIds.push(id);
    riders.push({ id, name: r.name, birthYear });
  }

  const byText = (text: string) => templates[text]!;
  const week = [
    { day: 1, template: byText(TEMPLATES[1]!.text) },
    { day: 2, template: byText(TEMPLATES[0]!.text) },
    { day: 3, template: byText(TEMPLATES[5]!.text) },
    { day: 5, template: byText(TEMPLATES[0]!.text) },
    { day: 6, template: byText(TEMPLATES[3]!.text) },
  ];
  // The same week as a block in the library: four weeks, ready to lay in.
  const blockItems = Array.from({ length: 4 }, (_, w) => [
    ...week.map((slot, i) => ({
      day: w * 7 + slot.day,
      templateId: w % 2 === 1 && i === 0 ? byText(TEMPLATES[2]!.text) : slot.template,
    })),
    ...(strength
      ? [
          { day: w * 7, templateId: strength.id },
          { day: w * 7 + 3, templateId: strength.id },
        ]
      : []),
  ]).flat();
  await createBlock(ctx, {
    name: pick({ da: "Vinterblok, 4 uger", en: "Winter block, 4 weeks" }, l),
    description: pick(
      {
        da: "To styrkepas, en VO2- eller AT-dag, en tempodag og to grundture om ugen.",
        en: "Two strength sessions, a VO2 or AT day, a tempo day and two endurance rides a week.",
      },
      l,
    ),
    weeks: 4,
    items: blockItems,
  });
  // DCU's October is "pause + frit": short, easy rides every other day and
  // nothing hard, so a demo opened in October plans that, not a full week.
  const breakWeek = [
    { day: 1, template: byText(TEMPLATES[3]!.text) },
    { day: 3, template: byText(TEMPLATES[6]!.text) },
    { day: 5, template: byText(TEMPLATES[6]!.text) },
  ];
  const firstMonday = addDaysIso(mondayOf(today), -7 * WEEKS_BACK);
  for (let w = 0; w <= WEEKS_BACK + 1; w++) {
    const monday = addDaysIso(firstMonday, 7 * w);
    const inBreak = phaseOf(Number(addDaysIso(monday, 3).slice(5, 7))) === "break";
    for (const [i, slot] of (inBreak ? breakWeek : week).entries()) {
      const template =
        !inBreak && w % 2 === 1 && i === 0 ? byText(TEMPLATES[2]!.text) : slot.template;
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
  const longRide = past.findLast(
    (s) => s.riderId === riderIds[0] && s.sport === "bike" && s.plannedMinutes >= 90,
  );
  const thresholds = new Map(riderIds.map((id, i) => [id, RIDERS[i]!]));
  const ridesFrom = addDaysIso(mondayOf(today), -7 * (RIDE_WEEKS - 1));
  let rideNo = 0;
  for (const s of past) {
    if (s === longRide) continue;
    if (rnd() < 0.1) continue;
    const factor = 0.85 + rnd() * 0.25;
    const rider = thresholds.get(s.riderId);
    if (s.sport === "bike" && s.onDate >= ridesFrom && rider) {
      rideNo++;
      const route = routeFor(diffDays(firstMonday, s.onDate), s.plannedMinutes);
      const weekend = [0, 6].includes(new Date(`${s.onDate}T12:00:00Z`).getUTCDay());
      await importFit(
        ctx,
        s.riderId,
        `${pick(route.name, l)}.fit`,
        rideFit(
          {
            route,
            kind: kindOf(s.title),
            minutes: s.plannedMinutes,
            ftp: rider.ftp,
            thresholdHr: rider.thr,
            factor,
            seed: 100 + rideNo,
            stopSeconds: s.plannedMinutes >= 120 && rnd() < 0.5 ? 12 * 60 : undefined,
          },
          Date.parse(`${s.onDate}T${weekend ? "07" : "14"}:30:00Z`),
        ),
      );
      continue;
    }
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

  if (longRide)
    await importFit(
      ctx,
      longRide.riderId,
      `${pick({ da: "Lang tur med bakker", en: "Long ride with hills" }, l)}.fit`,
      sampleRideFit(Date.parse(`${longRide.onDate}T08:00:00Z`)),
    );

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

  const month = Number(today.slice(5, 7));
  const racing = month >= 4 && month <= 9;
  for (const e of EVENTS) {
    const startsOn =
      racing || e.seasonDay === null
        ? addDaysIso(today, e.inDays)
        : addDaysIso(`${raceYear}-04-01`, e.seasonDay);
    await createEvent(ctx, {
      riderId: null,
      kind: e.kind,
      title: pick(e.title, l),
      startsOn,
      endsOn: addDaysIso(startsOn, e.days - 1),
      priority: e.priority,
      note: "",
    });
  }
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

  // Emma is the rider the demo's rider account becomes (roles.ts).
  await seedShowcase(ctx, l, { today, riders, ownRiderId: riderIds[0]! });
}
