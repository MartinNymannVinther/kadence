import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  activeHref,
  barItems,
  barLabelKey,
  homeHref,
  isActive,
  labelKey,
  menuFor,
  menuItems,
  nameChild,
  navFlags,
  navRole,
  type NavFlags,
  type NavRole,
} from "@/app/[locale]/(app)/nav-items";

/**
 * Two tiers for every role (docs/adr/0077): the primary places, the same
 * in the sidebar and the phone's bar, and "Mere". The lists are the
 * decision, so the tests hold each role to its tiers, in order, with the
 * installation's and the club's switches on and off.
 */

const OFF: NavFlags = { club: false, coachesRoom: false, rides: false, parent: false };
const ON: NavFlags = { club: true, coachesRoom: true, rides: false, parent: false };
const ROLES: NavRole[] = ["coach", "rider", "parent", "member", "self", "family"];
const EVERY_FLAGS: NavFlags[] = [OFF, ON, { ...ON, rides: true, parent: true }];

/** The two tiers as their keys, the way a reader meets them. */
const tiers = (role: NavRole, flags: NavFlags = OFF) => {
  const menu = menuFor(role, flags);
  return [menu.primary.map((i) => i.key), menu.more.map((i) => i.key)];
};
const keysOf = (role: NavRole, flags: NavFlags = OFF) => menuItems(role, flags).map((i) => i.key);
const barOf = (role: NavRole) => barItems(role).map((i) => i.key);

const coach = { isCoach: true, rider: null, children: [] };
const rider = { isCoach: false, rider: { id: "r1" }, children: [] };
const parent = { isCoach: false, rider: null, children: [{ riderId: "r1" }] };
const nobody = { isCoach: false, rider: null, children: [] };

describe("the role behind the menu", () => {
  it("is the one with the most to do", () => {
    expect(navRole(coach)).toBe("coach");
    expect(navRole({ ...coach, rider: { id: "r1" }, children: [{}] })).toBe("coach");
    expect(navRole(rider)).toBe("rider");
    expect(navRole({ ...rider, children: [{}] })).toBe("rider");
    expect(navRole(parent)).toBe("parent");
    expect(navRole(nobody)).toBe("member");
    expect(navRole(null)).toBe("member");
  });

  it("carries the person's own rider row and children into the flags", () => {
    expect(navFlags(rider, { club: true, coachesRoom: false })).toEqual({
      club: true,
      coachesRoom: false,
      rides: true,
      parent: false,
    });
    expect(navFlags(parent, { club: false, coachesRoom: true }).parent).toBe(true);
    expect(navFlags(null, { club: false, coachesRoom: false })).toEqual(OFF);
  });
});

describe("the coach's menu", () => {
  it("is Overblik, the calendar, the riders and the library; then the season, Rulle and knowledge", () => {
    expect(tiers("coach")).toEqual([
      ["today", "calendar", "riders", "library"],
      ["season", "rulle", "knowledge"],
    ]);
    expect(labelKey(menuFor("coach", OFF).primary[0]!)).toBe("overview");
    expect(menuFor("coach", OFF).primary[0]!.href).toBe("/today");
  });

  it("gains Klubmester and Trænerrummet under Mere when they are on, after Rulle", () => {
    expect(tiers("coach", ON)[1]).toEqual(["season", "rulle", "club", "coaches", "knowledge"]);
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).toContain("coaches");
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).not.toContain("club");
    expect(keysOf("coach", { ...OFF, club: true })).not.toContain("coaches");
  });

  it("puts a coach's own page and their child first under Mere, never in the bar", () => {
    expect(tiers("coach", { ...OFF, rides: true })[1]).toEqual([
      "me",
      "season",
      "rulle",
      "knowledge",
    ]);
    expect(tiers("coach", { ...OFF, parent: true })[1]).toEqual([
      "child",
      "season",
      "rulle",
      "knowledge",
    ]);
    expect(tiers("coach", { ...ON, rides: true, parent: true })).toEqual([
      ["today", "calendar", "riders", "library"],
      ["me", "child", "season", "rulle", "club", "coaches", "knowledge"],
    ]);
  });

  it("leads knowledge to one door, /help", () => {
    expect(menuFor("coach", OFF).more.at(-1)).toEqual({ key: "knowledge", href: "/help" });
  });

  it("puts the same four places in the bar, Overblik first", () => {
    expect(barOf("coach")).toEqual(["today", "calendar", "riders", "library"]);
    expect(barLabelKey(barItems("coach")[0]!)).toBe("overview");
  });
});

describe("the rider's menu", () => {
  it("is today, the calendar, their own page and the library; then the season, Rulle and knowledge", () => {
    expect(tiers("rider")).toEqual([
      ["today", "calendar", "me", "library"],
      ["season", "rulle", "knowledge"],
    ]);
    expect(labelKey(menuFor("rider", OFF).primary[0]!)).toBe("today");
  });

  it("shows Klubmester under Mere when the club keeps one, the one place riders see placings", () => {
    expect(tiers("rider", ON)[1]).toEqual(["season", "rulle", "club", "knowledge"]);
  });

  it("keeps the child's page under Mere for a rider who is also a parent", () => {
    expect(tiers("rider", { ...OFF, parent: true })[1]).toEqual([
      "child",
      "season",
      "rulle",
      "knowledge",
    ]);
  });

  it("never holds the coaches' places", () => {
    for (const flags of EVERY_FLAGS) {
      const keys = keysOf("rider", flags);
      for (const key of ["riders", "coaches"] as const) expect(keys).not.toContain(key);
    }
  });

  it("puts their own page before the library in the bar, as the sidebar does", () => {
    expect(barOf("rider")).toEqual(["today", "calendar", "me", "library"]);
  });
});

describe("the parent's menu", () => {
  it("is the child, the calendar and knowledge, with nothing behind Mere", () => {
    expect(tiers("parent")).toEqual([["child", "calendar", "knowledge"], []]);
    expect(menuItems("parent", OFF)[0]).toEqual({ key: "child", href: "/parents" });
    expect(homeHref("parent")).toBe("/parents");
  });

  it("keeps Klubmester under Mere when the club keeps one", () => {
    expect(tiers("parent", ON)).toEqual([["child", "calendar", "knowledge"], ["club"]]);
  });

  it("holds neither the library, the season nor Rulle", () => {
    for (const flags of EVERY_FLAGS) {
      const keys = keysOf("parent", flags);
      for (const key of ["library", "season", "rulle", "riders", "coaches", "today"] as const) {
        expect(keys).not.toContain(key);
      }
    }
  });

  it("names knowledge by a word that fits a fifth of a phone", () => {
    expect(barOf("parent")).toEqual(["child", "calendar", "knowledge"]);
    expect(barLabelKey(barItems("parent")[2]!)).toBe("knowledgeShort");
    expect(da.app.nav.knowledgeShort).toBe("Viden");
  });
});

describe("the child's name", () => {
  const menu = menuFor("parent", OFF);

  it("is the child's first name, where the parent may see it", () => {
    const named = nameChild(menu, [{ name: "Emma Holm", confirmed: true }]);
    expect(named.primary[0]).toEqual({ key: "child", href: "/parents", text: "Emma" });
    expect(named.primary.slice(1)).toEqual(menu.primary.slice(1));
  });

  it("stays Barnet while the link waits for the child's yes, or the child does not share", () => {
    expect(nameChild(menu, [{ name: "Emma Holm", confirmed: false }]).primary[0]).toEqual(
      menu.primary[0],
    );
    expect(nameChild(menu, [{ name: null, confirmed: true }]).primary[0]).toEqual(menu.primary[0]);
    expect(nameChild(menu, []).primary[0]).toEqual(menu.primary[0]);
  });

  it("is Børnene with more than one child", () => {
    const two = nameChild(menu, [
      { name: "Emma Holm", confirmed: true },
      { name: "Ida Holm", confirmed: true },
    ]);
    expect(two.primary[0]).toEqual({ key: "child", href: "/parents", label: "children" });
    expect(labelKey(two.primary[0]!)).toBe("children");
  });

  it("names the child under Mere too, for a coach or a rider who is also a parent", () => {
    const coachMenu = nameChild(menuFor("coach", { ...OFF, parent: true }), [
      { name: "Noah Friis", confirmed: true },
    ]);
    expect(coachMenu.more[0]).toEqual({ key: "child", href: "/parents", text: "Noah" });
    expect(coachMenu.primary).toEqual(menuFor("coach", OFF).primary);
  });
});

describe("the member's menu", () => {
  it("is today and the calendar, with knowledge behind Mere", () => {
    for (const flags of [OFF, ON]) {
      expect(tiers("member", flags)).toEqual([["today", "calendar"], ["knowledge"]]);
    }
    expect(barOf("member")).toEqual(["today", "calendar"]);
  });
});

describe("every menu", () => {
  it("has at most four primary places, the same whatever is turned on, and they are the bar", () => {
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const { primary } = menuFor(role, flags);
        expect(primary.length).toBeGreaterThanOrEqual(2);
        expect(primary.length).toBeLessThanOrEqual(4);
        expect(primary).toEqual(barItems(role));
      }
    }
  });

  it("holds each place once", () => {
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const keys = keysOf(role, flags);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("holds knowledge once for everyone: last under Mere, or in a parent's bar", () => {
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const menu = menuFor(role, flags);
        if (role === "parent") expect(menu.primary.at(-1)?.key).toBe("knowledge");
        else expect(menu.more.at(-1)?.key).toBe("knowledge");
        expect(keysOf(role, flags).filter((k) => k === "knowledge")).toHaveLength(1);
      }
    }
  });

  it("starts at the first place in the bar", () => {
    expect(homeHref("coach")).toBe("/today");
    expect(homeHref("rider")).toBe("/today");
    expect(homeHref("member")).toBe("/today");
  });

  it("has every word it shows, in both languages", () => {
    for (const messages of [da, en]) {
      const nav = messages.app.nav as Record<string, unknown>;
      for (const role of ROLES) {
        for (const flags of EVERY_FLAGS) {
          for (const item of menuItems(role, flags)) {
            expect(nav[labelKey(item)]).toEqual(expect.any(String));
          }
        }
        for (const item of barItems(role))
          expect(nav[barLabelKey(item)]).toEqual(expect.any(String));
      }
      for (const word of ["children", "more", "settings", "menuTitle", "barLabel"]) {
        expect(nav[word]).toEqual(expect.any(String));
      }
    }
  });
});

describe("the active place", () => {
  it("is the page or a page under it, never a neighbour sharing a prefix", () => {
    expect(isActive("/calendar", "/calendar")).toBe(true);
    expect(isActive("/calendar/session/abc", "/calendar")).toBe(true);
    expect(isActive("/club", "/coaches")).toBe(false);
    expect(isActive("/library-old", "/library")).toBe(false);
  });

  it("is the closest match: a guide under /help lights knowledge, and settings light nothing in the lists", () => {
    const hrefs = menuItems("coach", ON).map((i) => i.href);
    expect(activeHref("/help/coach", hrefs)).toBe("/help");
    expect(activeHref("/help", hrefs)).toBe("/help");
    expect(activeHref("/calendar/session/abc", hrefs)).toBe("/calendar");
    expect(activeHref("/settings/me", hrefs)).toBeNull();
  });
});
