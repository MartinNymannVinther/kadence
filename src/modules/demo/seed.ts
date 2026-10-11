import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { featureOn } from "@/core/features";
import { raceYearOf, seasonStartYear } from "@/modules/dcu";
import { saveTeamSettings } from "@/modules/team/settings";
import { addComment } from "@/modules/training/comments";
import { createEvent } from "@/modules/training/events";
import type { DemoRider } from "./club";
import { seedShowcase } from "./showcase";
import { random, seedEvents, seedLibrary, seedRider } from "./seed-parts";
import { ridePast, seedCheckins } from "./seed-ridden";
import { scheduleWeeks } from "./seed-weeks";
import { COMMENTS, EXAM, pick, RIDERS, type L } from "./seed-data";

export type { L };

/**
 * A U19 team in full swing for the demo (ADR 0005): six made-up riders
 * with thresholds and a season plan from DCU, the coach's library beside
 * DCU's strength programme, a library block with one session the coach
 * built in the planner itself (seed-weeks.ts, ADR 0059), six weeks of
 * group plans that were mostly ridden (a few missed, as in life), next
 * week planned, six weeks of check-ins with one rider tired and one with
 * a sore knee, races and a camp ahead, an exam, and a couple of comments.
 * The last weeks' rides come in as real FIT files — routes round
 * Østjylland, watt and pulse at each rider's own threshold (`rides.ts`) —
 * so the calendar, the records and every activity page show what an
 * upload gives; one long ride with a coffee stop is the showcase. The
 * rest of the product comes after (showcase.ts): the club's logo and
 * picture, a rider's own session, and the club championship and
 * Trænerrummet's example threads where the installation has them on
 * (ADR 0057). Written through the ordinary services, as the demo's
 * coach, so what the visitor sees is what the product does with real
 * rows.
 */

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
    // The championship only where the installation has it on (ADR 0057).
    clubChampionship: featureOn("clubChampionship"),
    lowIntensityFirst: true,
  });
  const { templates, strength } = await seedLibrary(ctx, l);

  const riders: DemoRider[] = [];
  for (const r of RIDERS) riders.push(await seedRider(ctx, l, r, { today, season, raceYear }));
  const riderIds = riders.map((r) => r.id);

  const { firstMonday } = await scheduleWeeks(ctx, l, { templates, strength, riderIds, today });

  const past = await ridePast(ctx, l, { riderIds, firstMonday, today, rnd });

  await seedCheckins(ctx, l, riderIds, today, rnd);

  await seedEvents(ctx, l, today, raceYear);
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
