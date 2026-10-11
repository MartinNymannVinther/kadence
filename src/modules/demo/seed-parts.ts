import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { createSeasonPlan } from "@/modules/season/plans";
import { createRider, setThresholds } from "@/modules/team/riders";
import { installDcuProgrammes } from "@/modules/training/dcu-library";
import { createEvent } from "@/modules/training/events";
import { addDcuWinterGoal } from "@/modules/training/goals";
import { createTemplate, listTemplates } from "@/modules/training/templates";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import type { DemoRider } from "./club";
import { EVENTS, pick, RIDERS, TEMPLATES, type L } from "./seed-data";

/**
 * The pieces a demo is seeded from, shared by the team (seed.ts) and the
 * person alone (seed-alone.ts, docs/adr/0080), so both tell the same
 * story through the same services.
 */

/** A small deterministic generator, so every demo tells the same story. */
export function random(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

/** DCU's programmes and the coach's own sessions in the library; the U19 strength programme. */
export async function seedLibrary(ctx: OrgContext, l: L) {
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

  return { templates, strength };
}

/**
 * One of the made-up riders, with thresholds, a season plan from DCU and
 * DCU's winter goal. `userId` makes the row the visitor's own, as a
 * person alone is their own rider (ADR 0010).
 */
export async function seedRider(
  ctx: OrgContext,
  l: L,
  r: (typeof RIDERS)[number],
  at: { today: string; season: number; raceYear: number; userId?: string | null },
): Promise<DemoRider> {
  const birthYear = at.raceYear - (16 + r.u19Year);
  const { id } = await createRider(ctx, {
    name: r.name,
    birthYear,
    sex: r.sex,
    categoryOverride: null,
    userId: at.userId ?? null,
  });
  await setThresholds(ctx, id, {
    ftpWatts: r.ftp,
    thresholdHr: r.thr,
    maxHr: r.thr + 18,
    restingHr: 48,
    thresholdsOn: addDaysIso(at.today, -40),
  });
  await createSeasonPlan(ctx, id, at.season).catch(() => undefined);
  await addDcuWinterGoal(
    ctx,
    id,
    pick({ da: "DCU: 30 styrkepas i vinter", en: "DCU: 30 strength sessions this winter" }, l),
  );
  return { id, name: r.name, birthYear };
}

/**
 * The races, the camp and the season opener: the team's when `riderId` is
 * null, one rider's own in a personal workspace.
 */
export async function seedEvents(
  ctx: OrgContext,
  l: L,
  today: string,
  raceYear: number,
  riderId: string | null = null,
): Promise<void> {
  const month = Number(today.slice(5, 7));
  const racing = month >= 4 && month <= 9;
  for (const e of EVENTS) {
    const startsOn =
      racing || e.seasonDay === null
        ? addDaysIso(today, e.inDays)
        : addDaysIso(`${raceYear}-04-01`, e.seasonDay);
    await createEvent(ctx, {
      riderId,
      kind: e.kind,
      title: pick(e.title, l),
      startsOn,
      endsOn: addDaysIso(startsOn, e.days - 1),
      priority: e.priority,
      note: "",
      ...e.where?.[l],
    });
  }
}
