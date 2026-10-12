import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { raceYearOf, seasonStartYear } from "@/modules/dcu";
import { recordSignupConsents } from "@/modules/consent/service";
import { createSeasonPlan } from "@/modules/season/plans";
import { createRider, setThresholds } from "@/modules/team/riders";
import { saveTeamSettings } from "@/modules/team/settings";
import { setTrainingProfile } from "@/modules/team/training-profile";
import { random, seedEvents, seedLibrary } from "./seed-parts";
import { ridePast, seedCheckins } from "./seed-ridden";
import { scheduleWeeks } from "./seed-weeks";
import type { L, Text } from "./seed-data";

/** Who the visitor is in "Prøv som voksen": Emma's father, riding on his own. Invented. */
export const ADULT_RIDER = {
  name: "Lars Holm",
  birthYear: 1984,
  sex: "male" as const,
  ftp: 245,
  thr: 166,
};

/** His personal workspace, named as a registration names it (docs/adr/0080). */
export const ADULT_NAME: Text = { da: "Lars' træning", en: "Lars's training" };

/**
 * `/demo?alene=voksen` (docs/adr/0091): an adult alone in a personal
 * workspace — born 1984, so a senior, on the Supermotionist profile, with
 * a season plan from the profile's hours. The same pieces as the youth
 * rider alone (seed-alone.ts): the library, six weeks of training laid in
 * and mostly ridden, next week planned, six weeks of check-ins and the
 * races ahead as his own. The team plans by DCU, which has no hours for
 * him, so Kadence's own profile fills the gap. No DCU winter goal: that
 * is U17's and U19's.
 */
export async function seedDemoAdult(ctx: OrgContext, l: L, now = new Date()): Promise<string> {
  const today = todayInCopenhagen(now);
  const season = seasonStartYear(today);
  const raceYear = raceYearOf(season);
  const rnd = random(11);

  await saveTeamSettings(ctx, {
    teamKind: "mixed",
    aiOnRiderData: false,
    allowYouthWeight: false,
    guidance: "dcu-2025",
    clubChampionship: false,
    lowIntensityFirst: true,
  });
  const { templates, strength } = await seedLibrary(ctx, l);
  const { id } = await createRider(ctx, {
    name: ADULT_RIDER.name,
    birthYear: ADULT_RIDER.birthYear,
    sex: ADULT_RIDER.sex,
    categoryOverride: null,
    userId: ctx.userId,
  });
  await setTrainingProfile(ctx, { riderId: id, profile: "super-motionist" });
  await setThresholds(ctx, id, {
    ftpWatts: ADULT_RIDER.ftp,
    thresholdHr: ADULT_RIDER.thr,
    maxHr: ADULT_RIDER.thr + 16,
    restingHr: 52,
    thresholdsOn: addDaysIso(today, -40),
  });
  await createSeasonPlan(ctx, id, season);
  const riderIds = [id];
  const { firstMonday } = await scheduleWeeks(ctx, l, { templates, strength, riderIds, today });
  await ridePast(ctx, l, { riderIds, firstMonday, today, rnd });
  await seedCheckins(ctx, l, riderIds, today, rnd);
  await seedEvents(ctx, l, today, raceYear, id);
  await recordSignupConsents(ctx, { riderId: id, locale: l });
  return id;
}
