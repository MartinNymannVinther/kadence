import { describe, expect, it } from "vitest";
import {
  homeHref,
  labelKey,
  menuFor,
  menuItems,
  nameWard,
  navRole,
  type NavFlags,
  type NavRole,
} from "@/app/[locale]/(app)/nav-items";

/**
 * A personal workspace (docs/adr/0080) is one person's training: its
 * owner who rides gets the rider's places with planning ("self"), a parent
 * who owns their child's gets the child's page ("family"), and neither
 * meets anything about a team. The shared rules for every menu — at most
 * four primary places, knowledge once, every word in both languages — are
 * held for these roles too in nav-items.test.ts.
 */

const OFF: NavFlags = { club: false, coachesRoom: false, rides: false, parent: false };
const ON: NavFlags = { club: true, coachesRoom: true, rides: false, parent: false };
const EVERY_FLAGS: NavFlags[] = [OFF, ON, { ...ON, rides: true, parent: true }];

const tiers = (role: NavRole, flags: NavFlags = OFF) => {
  const menu = menuFor(role, flags);
  return [menu.primary.map((i) => i.key), menu.more.map((i) => i.key)];
};
const keysOf = (role: NavRole, flags: NavFlags = OFF) => menuItems(role, flags).map((i) => i.key);

const coach = { isCoach: true, rider: null, children: [] };
const rider = { isCoach: false, rider: { id: "r1" }, children: [] };
const parent = { isCoach: false, rider: null, children: [{ riderId: "r1" }] };

describe("a personal workspace's menus (ADR 0080)", () => {
  const ownRider = { ...coach, rider: { id: "r1" } };

  it("follow the workspace: its owner who rides is 'self', a parent who owns it is 'family'", () => {
    expect(navRole(ownRider, "personal")).toBe("self");
    expect(navRole(coach, "personal")).toBe("family");
    expect(navRole(ownRider, "club")).toBe("coach");
    expect(navRole(ownRider)).toBe("coach");
    // A child invited into a parent's own workspace is a rider there, as on a team.
    expect(navRole(rider, "personal")).toBe("rider");
    expect(navRole(parent, "personal")).toBe("parent");
  });

  it("give the person who rides the rider's places with the library, and nothing about a team", () => {
    for (const flags of EVERY_FLAGS) {
      expect(tiers("self", { ...flags, parent: false })).toEqual([
        ["today", "calendar", "me", "library"],
        ["season", "rulle", "knowledge"],
      ]);
      const keys = keysOf("self", flags);
      for (const team of ["riders", "club", "coaches"]) expect(keys).not.toContain(team);
    }
    expect(labelKey(menuFor("self", OFF).primary[0]!)).toBe("today");
    expect(homeHref("self")).toBe("/today");
  });

  it("give a parent who owns it the child, the calendar, the library and the season", () => {
    expect(tiers("family", ON)).toEqual([
      ["child", "calendar", "library", "season"],
      ["knowledge"],
    ]);
    expect(keysOf("family", ON)).not.toContain("today");
  });

  it("lead a parent to the child's own page, by first name, or to the list for two", () => {
    const menu = menuFor("family", OFF);
    const one = nameWard(menu, [{ id: "r9", name: "Ida Marie Berg" }]).primary[0]!;
    expect(one).toMatchObject({ key: "child", href: "/riders/r9", text: "Ida" });
    const two = nameWard(menu, [
      { id: "a", name: "Ida" },
      { id: "b", name: "Otto" },
    ]).primary[0]!;
    expect(two).toMatchObject({ href: "/riders", label: "children" });
    expect(nameWard(menu, []).primary[0]).toEqual(menu.primary[0]);
    // A team's parent page is never touched.
    expect(nameWard(menuFor("parent", OFF), [{ id: "r9", name: "Ida" }]).primary[0]!.href).toBe(
      "/parents",
    );
  });
});
