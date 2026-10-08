import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToLines } from "@/modules/teams/dcu/html";
import { parseDcuClasses, parseDcuPoints, parseDcuSeasons } from "@/modules/teams/dcu/points-parse";
import { parseDcuTeams } from "@/modules/teams/dcu/teams-parse";
import { nameKey, tidyCase } from "@/modules/teams/normalise";
import {
  currentSeason,
  dataRideDate,
  nationStanding,
  readCountryId,
  readRankings,
  readRiders,
  readSeasons,
  riderName,
} from "@/modules/teams/uci/parse";

/**
 * The teams page's readers (ADR 0072), against pages and answers saved
 * on 8 October 2026 with every person's name, address and licence number
 * replaced: Cykling Danmark's team list and points list, and the UCI's
 * DataRide answers. A reader that gets a shape it does not know gives
 * nothing rather than a wrong number.
 */

const fixture = (name: string) => readFileSync(`tests/teams/fixtures/${name}`, "utf8");
const uci = JSON.parse(fixture("uci.json")) as Record<string, unknown>;

describe("names across the sources", () => {
  it("match on letters and digits alone, case and diacritics aside", () => {
    expect(nameKey("Airtox  Carl Ras")).toBe(nameKey("AIRTOX - CARL RAS"));
    expect(nameKey("Alé JS Holstebro CC – Junior Team")).toBe(
      nameKey("ALÈ JS Holstebro CC - Junior Team"),
    );
    expect(nameKey("Team coloQuick")).toBe("teamcoloquick");
    expect(nameKey("Jølving")).toBe("jolving");
  });

  it("tidy a name that shouts, and leave one that does not", () => {
    expect(tidyCase("LIDL-TREK FUTURE RACING")).toBe("Lidl-Trek Future Racing");
    expect(tidyCase("Team coloQuick")).toBe("Team coloQuick");
  });

  it("turn the UCI's 'LANDBO Mads' into Mads Landbo", () => {
    expect(riderName("LANDBO Mads")).toBe("Mads Landbo");
    expect(riderName("RIBEIRO BRAVO Henrique")).toBe("Henrique Ribeiro Bravo");
    expect(riderName("VAN KERCKHOVE Matisse")).toBe("Matisse Van Kerckhove");
    expect(riderName("Mads Landbo")).toBe("Mads Landbo");
  });
});

describe("Cykling Danmark's team list", () => {
  const teams = parseDcuTeams(fixture("dcu-teams.html"));

  it("reads every road team under its level, with the club, the manager and the address", () => {
    expect(teams).toHaveLength(21);
    expect(teams.filter((t) => t.level === "uciContinental").map((t) => t.name)).toEqual([
      "BHS - PL Beton Bornholm",
      "Airtox - Carl Ras",
      "Team coloQuick",
      "Team Give Steele",
    ]);
    expect(teams.filter((t) => t.level === "u19Men")).toHaveLength(7);
    expect(teams.filter((t) => t.level === "u19Women")).toHaveLength(1);
    const odder = teams.find((t) => t.name === "Team Kvickly Odder");
    expect(odder).toMatchObject({ level: "u19Men", parentClub: "Odder Cykelklub" });
    expect(odder?.manager).toMatch(/\w+ \w+/);
    expect(odder?.contact).toMatch(/@example\.org$/);
  });

  it("takes a contact written on the line after the manager", () => {
    const women = teams.find((t) => t.name === "Team Strada Elite Women");
    expect(women?.contact).toMatch(/@example\.org$/);
  });

  it("stops at the track and gravel teams", () => {
    expect(teams.some((t) => /STARK|WILLING/i.test(t.name))).toBe(false);
  });

  it("is nothing for a page without the list", () => {
    expect(parseDcuTeams("<html><body><p>Hej</p></body></html>")).toEqual([]);
  });
});

describe("Cykling Danmark's points list", () => {
  const html = fixture("dcu-points.html");

  it("reads the rows with place, name, team, birth year and points", () => {
    const riders = parseDcuPoints(html);
    expect(riders).toHaveLength(12);
    expect(riders[0]).toEqual({
      rank: 1,
      name: "Anna Andersen",
      team: "Team Uno-X - Carl Ras Roskilde Junior",
      points: 212,
      born: 2009,
    });
    expect(riders.every((r) => r.rank > 0 && r.points >= 0)).toBe(true);
  });

  it("reads the seasons and the road's classes from the form", () => {
    expect(parseDcuSeasons(html).slice(0, 2)).toEqual([
      { id: 17, year: 2026 },
      { id: 14, year: 2025 },
    ]);
    const classes = parseDcuClasses(html);
    expect(classes.get("U19")).toBe(961);
    expect(classes.get("U19P")).toBe(962);
    expect(classes.get("A")).toBe(952);
  });

  it("decodes entities and reads a page as lines", () => {
    expect(decodeEntities("&#xC5;rgang &amp; &nbsp;point")).toBe("Årgang &  point");
    expect(htmlToLines("<p>Et</p><script>x()</script><div>To<br>Tre</div>")).toEqual([
      "Et",
      "To",
      "Tre",
    ]);
  });
});

describe("the UCI's DataRide", () => {
  it("reads the seasons and picks the one that holds today", () => {
    const seasons = readSeasons(uci.seasons);
    expect(seasons[0]).toMatchObject({ id: 464, year: 2026 });
    expect(currentSeason(seasons, "2026-10-08")?.year).toBe(2026);
    expect(currentSeason(seasons, "2026-01-05")?.year).toBe(2026);
    expect(currentSeason(seasons, "2000-01-01")).toBeNull();
  });

  it("writes a DataRide date as a day", () => {
    expect(dataRideDate("/Date(1760911200000)/")).toBe("2025-10-19");
    expect(dataRideDate("/Date(-62135596800000)/")).toBeNull();
    expect(dataRideDate(null)).toBeNull();
  });

  it("finds Denmark among the countries", () => {
    expect(readCountryId(uci.countries, "DEN")).toBe(56);
    expect(readCountryId(uci.countries, "XXX")).toBeNull();
  });

  it("reads the rankings a category has, individual and nation", () => {
    const u23 = readRankings(uci.rankingsU23);
    const world = u23.find((r) => r.rankingTypeId === 1 && /world/i.test(r.name));
    expect(world).toMatchObject({ rankingId: 342, momentId: 205703 });
    const cup = readRankings(uci.rankingsJuniorMen).find((r) => r.rankingTypeId === 3);
    expect(cup?.name).toMatch(/Nations/);
    expect(nationStanding(cup!.standing, "ITA")).toEqual({ rank: 1, points: 261 });
    expect(nationStanding(cup!.standing, "DEN")).toBeNull();
  });

  it("reads a page of riders with their team, points and birth year", () => {
    const page = readRiders(uci.ridersPage);
    expect(page.total).toBe(6);
    expect(page.riders[0]).toMatchObject({
      rank: 18,
      name: "Anna Andersen",
      team: "TEAM COLOQUICK",
      points: 202,
      born: 2004,
    });
    expect(page.computedOn).toBe("2026-10-06");
    expect(readRiders({ data: [{ Rank: "x" }] }).riders).toEqual([]);
    expect(readRiders(null).riders).toEqual([]);
  });
});
