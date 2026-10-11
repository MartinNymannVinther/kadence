import { todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { raceYearOf, seasonStartYear } from "@/modules/dcu";
import { saveTeamSettings } from "@/modules/team/settings";
import { recordSignupConsents } from "@/modules/consent/service";
import { random, seedEvents, seedLibrary, seedRider } from "./seed-parts";
import { ridePast, seedCheckins } from "./seed-ridden";
import { scheduleWeeks } from "./seed-weeks";
import { RIDERS, type L } from "./seed-data";

/** Who the visitor is in "Prøv alene": the team demo's Emma, riding U19 on her own. */
export const ALONE_RIDER = RIDERS[0]!;

/**
 * "Prøv alene" (docs/adr/0080): a personal workspace with one U19 rider,
 * who is the visitor — coach and rider in one (ADR 0010). The same story
 * as the team's (seed.ts), through the same pieces and services: DCU's
 * programmes and the sessions in the library, thresholds and a season
 * plan from DCU, six weeks of training laid in and mostly ridden (the
 * last weeks as real FIT files), next week planned, six weeks of
 * check-ins, and the races and the camp ahead as the rider's own. Nothing
 * about a team: no other riders, no club championship, no Trænerrum.
 */
export async function seedDemoAlone(ctx: OrgContext, l: L, now = new Date()): Promise<string> {
  const today = todayInCopenhagen(now);
  const season = seasonStartYear(today);
  const raceYear = raceYearOf(season);
  const rnd = random(7);

  await saveTeamSettings(ctx, {
    teamKind: "U19",
    aiOnRiderData: false,
    allowYouthWeight: false,
    guidance: "dcu-2025",
    clubChampionship: false,
    // On in the demo so a visitor sees it; off for a new workspace (ADR 0053).
    lowIntensityFirst: true,
  });
  const { templates, strength } = await seedLibrary(ctx, l);
  const rider = await seedRider(ctx, l, ALONE_RIDER, {
    today,
    season,
    raceYear,
    userId: ctx.userId,
  });
  const riderIds = [rider.id];
  const { firstMonday } = await scheduleWeeks(ctx, l, { templates, strength, riderIds, today });
  await ridePast(ctx, l, { riderIds, firstMonday, today, rnd });
  await seedCheckins(ctx, l, riderIds, today, rnd);
  await seedEvents(ctx, l, today, raceYear, rider.id);
  // The two yeses a person gives when they create their own workspace
  // (ADR 0088), so the visitor finds the consent under Indstillinger → Data
  // and can try withdrawing it and giving it again.
  await recordSignupConsents(ctx, { riderId: rider.id, locale: l });
  return rider.id;
}
