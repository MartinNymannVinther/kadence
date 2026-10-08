import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchDcu } from "@/modules/teams/dcu/fetch";
import { wantsRefresh, RETRY_AFTER_MS, STALE_AFTER_MS } from "@/modules/teams/refresh";
import { REGISTRY, registryTeam } from "@/modules/teams/registry";
import { EMPTY_SNAPSHOT, type TeamsSnapshot } from "@/modules/teams/types";
import { fetchUci } from "@/modules/teams/uci/fetch";
import { buildTeamsView, riderKey, u23Born } from "@/modules/teams/view";

/**
 * The teams page from its sources to its view (ADR 0072): the fetchers
 * walking the sources' calls against canned answers, the registry's
 * shape, the view's matching of riders to teams across lists, and when
 * a snapshot wants reading again.
 */

const fixture = (name: string) => readFileSync(`tests/teams/fixtures/${name}`, "utf8");
const uci = JSON.parse(fixture("uci.json")) as Record<string, unknown>;

/** A fetch that answers DataRide's and DCU's addresses from the fixtures, and logs what was asked. */
function fakeFetch(log: string[] = []) {
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const html = (body: string) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } });
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const form =
      typeof init?.body === "string" ? new URLSearchParams(init.body) : new URLSearchParams();
    log.push(`${init?.method ?? "GET"} ${url.replace(/\?.*$/, "")}`);
    if (url.includes("GetDisciplineSeasons")) return json(uci.seasons);
    if (url.includes("GetCountries")) return json(uci.countries);
    if (url.includes("RankingsDiscipline")) {
      const category = form.get("filter[filters][1][value]");
      return json(
        category === "26" ? uci.rankingsU23 : category === "24" ? uci.rankingsJuniorMen : [],
      );
    }
    if (url.includes("ObjectRankings"))
      return json(form.get("rankingTypeId") === "3" ? uci.cupPage : uci.ridersPage);
    if (url.includes("om-teams")) return html(fixture("dcu-teams.html"));
    // The portal's form, then the U19 list; the other classes answer an empty table.
    if (url.includes("/points")) {
      const classId = new URL(url).searchParams.get("ClassId");
      return html(
        classId === null || classId === "961" ? fixture("dcu-points.html") : "<table></table>",
      );
    }
    return new Response("no", { status: 404 });
  };
}

describe("reading the UCI", () => {
  it("looks every id up and comes back with Denmark's U23 riders and cup places", async () => {
    const log: string[] = [];
    const data = await fetchUci(fakeFetch(log), "2026-10-08");
    expect(data.season).toBe(2026);
    expect(data.computedOn).toBe("2026-10-06");
    expect(data.u23Men).toHaveLength(6);
    expect(data.u23Men[0]).toMatchObject({
      rank: 18,
      name: "Anna Andersen",
      team: "TEAM COLOQUICK",
    });
    expect(data.nationsCup.men).toEqual({ rank: 6, points: 119 });
    expect(data.nationsCup.women).toBeNull();
    expect(log.filter((l) => l.includes("ObjectRankings"))).toHaveLength(2);
  });
});

describe("reading Cykling Danmark", () => {
  it("reads the team list and this and last season's lists from the portal's own form", async () => {
    const log: string[] = [];
    const data = await fetchDcu(fakeFetch(log), "2026-10-08");
    expect(data.season).toBe(2026);
    expect(data.teams).toHaveLength(21);
    expect(data.points.u19Men).toHaveLength(12);
    expect(data.lastSeason?.season).toBe(2025);
    expect(log.filter((l) => l.includes("/points"))).toHaveLength(6);
  });
});

describe("the registry", () => {
  it("holds every team once, found by any of its names", () => {
    expect(REGISTRY.length).toBeGreaterThan(20);
    expect(registryTeam("TEAM COLOQUICK")?.id).toBe("team-coloquick");
    expect(registryTeam("Team coloQuick")?.id).toBe("team-coloquick");
    expect(registryTeam("ALÈ JS Holstebro CC - Junior Team")?.id).toBe("ale-js-holstebro-junior");
    expect(registryTeam("Some Club")).toBeNull();
  });

  it("gives a Danish team a country and a foreign team its own", () => {
    for (const team of REGISTRY) {
      if (team.level !== "foreign") expect(team.country).toBe("DK");
    }
    expect(registryTeam("LIDL-TREK FUTURE RACING")?.level).toBe("foreign");
  });
});

describe("the view", () => {
  const snapshot = async (): Promise<TeamsSnapshot> => ({
    version: 1,
    uci: {
      fetchedAt: "2026-10-08T06:00:00Z",
      data: await fetchUci(fakeFetch(), "2026-10-08"),
      error: null,
    },
    dcu: {
      fetchedAt: "2026-10-08T06:00:00Z",
      data: await fetchDcu(fakeFetch(), "2026-10-08"),
      error: null,
    },
  });

  it("puts every Danish team under DCU's level with what DCU lists for it", async () => {
    const view = buildTeamsView(await snapshot(), true);
    expect(view.byLevel.uciContinental.map((t) => t.id)).toEqual([
      "airtox-carl-ras",
      "bhs-pl-beton-bornholm",
      "team-coloquick",
      "team-give-steel",
    ]);
    expect(view.byLevel.u19Men).toHaveLength(7);
    const odder = view.byLevel.u19Men.find((t) => t.id === "team-kvickly-odder");
    expect(odder).toMatchObject({
      registeredWithDcu: true,
      parentClub: "Odder Cykelklub",
      home: "Odder",
    });
    expect(odder?.contact).toMatch(/@example\.org$/);
  });

  it("seats a rider with a team the lists know, and nowhere for a club", async () => {
    const view = buildTeamsView(await snapshot(), true);
    const roskilde = view.byLevel.u19Men.find(
      (t) => t.id === "team-uno-x-carl-ras-roskilde-junior",
    );
    expect(roskilde?.riders.map((r) => r.name)).toContain("Anna Andersen");
    expect(roskilde?.riders[0]?.dcu).toMatchObject({ list: "u19Men", rank: 1, points: 212 });
    const all = [...Object.values(view.byLevel).flat(), ...view.foreign];
    expect(all.some((t) => /Cykle Klub|Cykelklub/i.test(t.name) && !t.registeredWithDcu)).toBe(
      false,
    );
  });

  it("sits a U23 rider with their team from the UCI and finds foreign teams from the lists", async () => {
    const view = buildTeamsView(await snapshot(), true);
    const colo = view.byLevel.uciContinental.find((t) => t.id === "team-coloquick");
    expect(colo?.riders[0]).toMatchObject({
      name: "Anna Andersen",
      uci: { rank: 18, points: 202 },
    });
    expect(view.foreign.map((t) => t.id)).toContain("lidl-trek-future-racing");
    expect(view.nationsCup).toEqual({ season: 2026, men: { rank: 6, points: 119 }, women: null });
  });

  it("keeps a rider on two lists as one line, under the longer name", () => {
    expect(riderKey({ name: "Sylvester Stokbro", born: 2007 })).toBe(
      riderKey({ name: "Sylvester Vittinghus Stokbro", born: 2007 }),
    );
    expect(riderKey({ name: "Sylvester Stokbro", born: 2007 })).not.toBe(
      riderKey({ name: "Sylvester Stokbro", born: 2008 }),
    );
    expect(u23Born(2026)).toEqual({ from: 2004, to: 2007 });
  });

  it("shows the registry alone when nothing has been read, and says so", () => {
    const view = buildTeamsView(EMPTY_SNAPSHOT, false);
    expect(view.byLevel.uciContinental).toHaveLength(4);
    expect(
      view.byLevel.uciContinental.every((t) => !t.registeredWithDcu && t.riders.length === 0),
    ).toBe(true);
    expect(view.sources.dcu.on).toBe(false);
    expect(view.sources.uci.fetchedAt).toBeNull();
    expect(view.nationsCup).toBeNull();
  });
});

describe("when a snapshot wants reading again", () => {
  const at = Date.parse("2026-10-08T06:00:00Z");
  it("is at once with nothing read, after a day with a good read, and after an hour with a failed one", () => {
    expect(wantsRefresh({ fetchedAt: null, data: null, error: null }, at)).toBe(true);
    const good = { fetchedAt: "2026-10-08T06:00:00Z", data: {}, error: null };
    expect(wantsRefresh(good, at + STALE_AFTER_MS - 1)).toBe(false);
    expect(wantsRefresh(good, at + STALE_AFTER_MS + 1)).toBe(true);
    const failed = { fetchedAt: "2026-10-08T06:00:00Z", data: {}, error: "status 503" };
    expect(wantsRefresh(failed, at + RETRY_AFTER_MS - 1)).toBe(false);
    expect(wantsRefresh(failed, at + RETRY_AFTER_MS + 1)).toBe(true);
  });
});
