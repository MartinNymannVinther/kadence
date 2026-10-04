import type { OrgContext } from "@/core/db/tenant";
import { addChampion, crownChampions } from "@/modules/club/champions";
import {
  addRound,
  createChampionship,
  saveRoundEntries,
  type EntryInput,
} from "@/modules/club/service";
import { parseTime, type ClubClass } from "@/modules/club/standings";
import { pick, type L, type Text } from "./seed-data";

/**
 * The demo club's championship (docs/adr/0054, ADR 0051): the last
 * season whose rounds are all ridden — a time trial, a hill climb and a
 * road race — with the team's riders and a few of the club's younger
 * riders and grown-ups beside them; the year before on the same time
 * trial course, so personal records and the year's improvement show; and
 * club champions over the years, some typed in from before Kadence.
 * Guests and earlier champions are made up and belong to nobody.
 */

export type DemoRider = { id: string; name: string; birthYear: number };

const GUESTS: Array<{ name: string; class: ClubClass }> = [
  { name: "Lukas Vind", class: "U17" },
  { name: "Sofie Krog", class: "U17" },
  { name: "Elias Mørk", class: "U17" },
  { name: "Henrik Bo", class: "open" },
  { name: "Camilla Rask", class: "open" },
];

const TT: Text = { da: "Enkeltstart på Bjerrevej", en: "Time trial on Bjerrevej" };
const HILL: Text = { da: "Bakkeløb op ad Ravnsbjerg", en: "Hill climb up Ravnsbjerg" };
const ROAD: Text = { da: "Klubbens linjeløb", en: "The club road race" };

/** Times on the time trial course, the season and the year before; the hill climb's. */
const TT_NOW: Record<string, string> = {
  "Oskar Lund": "12:58.4",
  "Magnus Berg": "13:21.0",
  "Noah Friis": "13:40.2",
  "Ida Kjær": "14:12.9",
  "Emma Holm": "14:31.6",
  "Freja Dahl": "14:48.3",
  "Lukas Vind": "15:02.1",
  "Henrik Bo": "15:20.7",
  "Sofie Krog": "15:44.0",
  "Elias Mørk": "16:10.5",
  "Camilla Rask": "16:35.2",
};
const TT_BEFORE: Record<string, string> = {
  "Oskar Lund": "13:31.0",
  "Magnus Berg": "13:39.5",
  "Noah Friis": "14:22.8",
  "Ida Kjær": "14:40.1",
  "Emma Holm": "15:12.4",
  "Freja Dahl": "15:52.6",
  "Henrik Bo": "15:41.0",
};
const HILL_NOW: Record<string, string> = {
  "Oskar Lund": "3:41.2",
  "Magnus Berg": "3:52.8",
  "Noah Friis": "3:58.1",
  "Emma Holm": "4:12.5",
  "Freja Dahl": "4:20.3",
  "Lukas Vind": "4:25.0",
  "Elias Mørk": "4:38.9",
  "Henrik Bo": "4:44.2",
  "Sofie Krog": "4:51.7",
  "Camilla Rask": "5:12.3",
};
/** Who did not start the hill climb, and the road race's finishing order and the one who stopped. */
const HILL_DNS = ["Ida Kjær"];
const ROAD_ORDER = [
  "Magnus Berg",
  "Oskar Lund",
  "Noah Friis",
  "Lukas Vind",
  "Ida Kjær",
  "Emma Holm",
  "Sofie Krog",
  "Freja Dahl",
  "Henrik Bo",
  "Camilla Rask",
];
const ROAD_DNF = ["Elias Mørk"];

/** Champions from before Kadence, typed in by hand: years back from the season. */
const EARLIER: Array<{ yearsBack: number; class: ClubClass; name: string }> = [
  { yearsBack: 2, class: "U19", name: "Mikkel Thorsen" },
  { yearsBack: 2, class: "U17", name: "Clara Juhl" },
  { yearsBack: 2, class: "open", name: "Henrik Bo" },
  { yearsBack: 3, class: "U19", name: "Rasmus Kjeldsen" },
  { yearsBack: 3, class: "open", name: "Henrik Bo" },
];

/** A rider's class in a calendar year, by age (src/modules/dcu/classes.ts: U17 15–16, U19 17–18). */
function classIn(year: number, birthYear: number): ClubClass {
  const age = year - birthYear;
  return age <= 16 ? "U17" : age <= 18 ? "U19" : "U23";
}

export async function seedClubChampionship(
  ctx: OrgContext,
  l: L,
  riders: DemoRider[],
  today: string,
): Promise<void> {
  const thisYear = Number(today.slice(0, 4));
  // The last season with all its rounds behind it: this one from September.
  const season = Number(today.slice(5, 7)) >= 9 ? thisYear : thisYear - 1;
  const people = (year: number) => [
    ...riders.map((r) => ({ riderId: r.id, name: r.name, class: classIn(year, r.birthYear) })),
    ...GUESTS.map((g) => ({ riderId: null, name: g.name, class: g.class })),
  ];
  const timed = (year: number, times: Record<string, string>, dns: string[] = []) =>
    people(year).flatMap((p): EntryInput[] => {
      if (dns.includes(p.name)) return [{ ...p, timeMs: null, place: null, status: "dns" }];
      const time = times[p.name];
      return time ? [{ ...p, timeMs: parseTime(time), place: null, status: "finished" }] : [];
    });
  const placed = (year: number) =>
    people(year).flatMap((p): EntryInput[] => {
      if (ROAD_DNF.includes(p.name)) return [{ ...p, timeMs: null, place: null, status: "dnf" }];
      const place = ROAD_ORDER.indexOf(p.name) + 1;
      return place > 0 ? [{ ...p, timeMs: null, place, status: "finished" }] : [];
    });
  const title = (year: number) =>
    pick({ da: `Klubmesterskab ${year}`, en: `Club championship ${year}` }, l);
  const champion = pick({ da: "Klubmester", en: "Club champion" }, l);

  // The year before: one round, on the same course as this season's time trial.
  const before = await createChampionship(ctx, { season: season - 1, title: title(season - 1) });
  const firstTt = await addRound(ctx, {
    championshipId: before.id,
    heldOn: `${season - 1}-05-14`,
    kind: "tt",
    title: pick(TT, l),
    measure: "time",
  });
  await saveRoundEntries(ctx, firstTt.id, timed(season - 1, TT_BEFORE));
  await crownChampions(ctx, before.id, champion);

  const now = await createChampionship(ctx, { season, title: title(season) });
  const rounds = [
    { heldOn: `${season}-05-13`, kind: "tt", title: TT, measure: "time" as const },
    { heldOn: `${season}-06-10`, kind: "hill", title: HILL, measure: "time" as const },
    { heldOn: `${season}-08-19`, kind: "road", title: ROAD, measure: "place" as const },
  ];
  for (const r of rounds) {
    const { id } = await addRound(ctx, {
      championshipId: now.id,
      heldOn: r.heldOn,
      kind: r.kind,
      title: pick(r.title, l),
      measure: r.measure,
    });
    const entries =
      r.kind === "tt"
        ? timed(season, TT_NOW)
        : r.kind === "hill"
          ? timed(season, HILL_NOW, HILL_DNS)
          : placed(season);
    await saveRoundEntries(ctx, id, entries);
  }
  await crownChampions(ctx, now.id, champion);

  for (const e of EARLIER)
    await addChampion(ctx, {
      year: season - e.yearsBack,
      class: e.class,
      title: champion,
      name: e.name,
    });
}
