import { describe, expect, it } from "vitest";
import {
  PER_GROUP,
  riderHref,
  searchableRiders,
  searchGroups,
  templateHref,
  type Hit,
  type Sources,
} from "@/modules/search/groups";

/**
 * What Søg lists (the search approved with docs/mockups/navigation): the
 * menu's places alone while nothing is typed, then four groups in a fixed
 * order, five rows at most in each, and riders only where there is
 * somebody else to find.
 */

const hit = (id: string, label: string, meta?: string): Hit => ({
  id,
  label,
  meta,
  href: `/${id}`,
});

const sources = (over: Partial<Sources> = {}): Sources => ({
  riders: [hit("r-emma", "Emma Holm"), hit("r-oskar", "Oskar Lund")],
  templates: [hit("t-tempo", "Tempo", "Cykel · 1 t 15 min")],
  menu: [hit("today", "Overblik"), hit("calendar", "Kalender"), hit("riders", "Ryttere")],
  settings: [hit("s-me", "Profil", "Indstillinger"), hit("s-team", "Holdet", "Indstillinger")],
  help: [hit("h-calendar", "Kalenderen"), hit("h-search", "Søg")],
  ...over,
});

const shape = (query: string, from: Sources = sources()) =>
  searchGroups(query, from).map((group) => [group.key, group.hits.map((h) => h.label)]);

describe("searchGroups", () => {
  it("shows the menu's places, in the menu's order, while nothing is typed", () => {
    expect(shape("")).toEqual([["places", ["Overblik", "Kalender", "Ryttere"]]]);
    expect(shape("  ")).toEqual([["places", ["Overblik", "Kalender", "Ryttere"]]]);
  });

  it("filters every group and keeps them in a fixed order: riders, sessions, places, help", () => {
    expect(shape("e")).toEqual([
      ["riders", ["Emma Holm"]],
      ["templates", ["Tempo"]],
      // Holdet has the e in its name, Profil only in "Indstillinger" beside it.
      ["places", ["Overblik", "Kalender", "Ryttere", "Holdet", "Profil"]],
      ["help", ["Kalenderen"]],
    ]);
  });

  it("finds the settings tabs by name and by the word Indstillinger", () => {
    expect(shape("profil")).toEqual([["places", ["Profil"]]]);
    expect(shape("indstil")).toEqual([["places", ["Profil", "Holdet"]]]);
  });

  it("leaves out a group with nothing in it, and says nothing when nothing is found", () => {
    expect(shape("oskar")).toEqual([["riders", ["Oskar Lund"]]]);
    expect(shape("zzz")).toEqual([]);
  });

  it("keeps at most five rows in a group", () => {
    const many = Array.from({ length: 9 }, (_, i) => hit(`r${i}`, `Rytter ${i}`));
    const groups = searchGroups("rytter", sources({ riders: many }));
    expect(PER_GROUP).toBe(5);
    expect(groups[0]).toEqual({ key: "riders", hits: many.slice(0, 5) });
  });

  it("shows nothing at all with an empty menu and nothing typed", () => {
    expect(shape("", sources({ menu: [] }))).toEqual([]);
  });
});

describe("whose riders, and where they lead", () => {
  const coach = { coach: true, riderId: null };
  const coachWhoRides = { coach: true, riderId: "r-trine" };
  const rider = { coach: false, riderId: "r-emma" };
  const parent = { coach: false, riderId: null };
  const riders = [{ id: "r-emma" }, { id: "r-oskar" }];

  it("lists the riders when there is anyone but the searcher", () => {
    expect(searchableRiders(riders, coach)).toEqual(riders);
    expect(searchableRiders([{ id: "r-emma" }], parent)).toEqual([{ id: "r-emma" }]);
    expect(searchableRiders([{ id: "r-trine" }, ...riders], coachWhoRides)).toHaveLength(3);
  });

  it("lists none for a rider who can only see themselves", () => {
    expect(searchableRiders([{ id: "r-emma" }], rider)).toEqual([]);
    expect(searchableRiders([], coach)).toEqual([]);
  });

  it("leads a coach to the rider's page, a parent to the children's page, and anyone to Mig for themselves", () => {
    expect(riderHref("r-oskar", coach)).toBe("/riders/r-oskar");
    expect(riderHref("r-emma", parent)).toBe("/parents");
    expect(riderHref("r-trine", coachWhoRides)).toBe("/me");
    expect(riderHref("r-emma", rider)).toBe("/me");
  });

  it("leads a template to its page in the library", () => {
    expect(templateHref("tpl_1")).toBe("/library/tpl_1");
  });
});
