import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  activeHref,
  barItems,
  barLabelKey,
  homeHref,
  isActive,
  menuGroups,
  menuItems,
  navFlags,
  navRole,
  type NavFlags,
  type NavGroupKey,
  type NavRole,
} from "@/app/[locale]/(app)/nav-items";

/**
 * One structure for every role, grouped by task (docs/adr/0061, amended
 * by 0068): the lists are the decision, so the tests hold each role to its
 * own groups, in order, with the installation's and the club's switches on
 * and off, and the bar to its places.
 */

const OFF: NavFlags = { club: false, coachesRoom: false, rides: false, parent: false };
const ON: NavFlags = { club: true, coachesRoom: true, rides: false, parent: false };
const ROLES: NavRole[] = ["coach", "rider", "parent", "member"];
const EVERY_FLAGS: NavFlags[] = [OFF, ON, { ...ON, rides: true, parent: true }];

/** Each group as its header and its keys, the way a reader meets them. */
const shape = (role: NavRole, flags: NavFlags = OFF) =>
  menuGroups(role, flags).map((g) => [g.key, g.items.map((i) => i.key)]);
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
  it("is the day, planning, the team, the tools and knowledge, without the parked parts", () => {
    expect(shape("coach")).toEqual([
      [null, ["today"]],
      ["planning", ["calendar", "season", "library"]],
      ["team", ["riders"]],
      ["tools", ["rulle"]],
      ["knowledge", ["guides", "coachGuide", "parentsGuide", "help"]],
    ]);
  });

  it("gains Klubmester and Trænerrummet in the team's group when they are on", () => {
    expect(shape("coach", ON)[2]).toEqual(["team", ["riders", "club", "coaches"]]);
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).toContain("coaches");
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).not.toContain("club");
    expect(keysOf("coach", { ...OFF, club: true })).not.toContain("coaches");
  });

  it("puts the open guides, both guides and Help under knowledge, where they lead", () => {
    const knowledge = menuGroups("coach", OFF).at(-1)!;
    expect(knowledge.items).toEqual([
      { key: "guides", href: "/guides" },
      { key: "coachGuide", href: "/help/coach" },
      { key: "parentsGuide", href: "/parents" },
      { key: "help", href: "/help" },
    ]);
  });

  it("gives a coach who also rides their own page after today", () => {
    expect(shape("coach", { ...OFF, rides: true })[0]).toEqual([null, ["today", "me"]]);
  });

  it("keeps the child's page after today for a coach who is also a parent", () => {
    expect(shape("coach", { ...OFF, parent: true })[0]).toEqual([null, ["today", "child"]]);
    expect(shape("coach", { ...OFF, rides: true, parent: true })[0]).toEqual([
      null,
      ["today", "me", "child"],
    ]);
  });

  it("then sends the parents' guide to its place on the child's page, so one page is not lit twice", () => {
    const items = menuItems("coach", { ...OFF, parent: true });
    expect(items.find((i) => i.key === "child")?.href).toBe("/parents");
    expect(items.find((i) => i.key === "parentsGuide")?.href).toBe("/parents#parent-guide");
    expect(
      activeHref(
        "/parents",
        items.map((i) => i.href),
      ),
    ).toBe("/parents");
  });

  it("puts four places and Mere in the bar", () => {
    expect(barOf("coach")).toEqual(["today", "calendar", "riders", "library"]);
  });
});

describe("the rider's menu", () => {
  it("is the day, training, and knowledge", () => {
    expect(shape("rider")).toEqual([
      [null, ["today", "calendar", "me"]],
      ["training", ["library", "season", "rulle"]],
      ["knowledge", ["guides", "help"]],
    ]);
  });

  it("shows Klubmester in a team group when the club keeps one, the one place riders see placings", () => {
    expect(shape("rider", ON)).toEqual([
      [null, ["today", "calendar", "me"]],
      ["training", ["library", "season", "rulle"]],
      ["team", ["club"]],
      ["knowledge", ["guides", "help"]],
    ]);
  });

  it("keeps the child's page for a rider who is also a parent", () => {
    expect(shape("rider", { ...OFF, parent: true })[0]).toEqual([
      null,
      ["today", "calendar", "me", "child"],
    ]);
  });

  it("never holds the coaches' places or their guides", () => {
    for (const flags of EVERY_FLAGS) {
      const keys = keysOf("rider", flags);
      for (const key of ["riders", "coaches", "coachGuide", "parentsGuide"] as const) {
        expect(keys).not.toContain(key);
      }
    }
  });

  it("puts the library before their own page in the bar", () => {
    expect(barOf("rider")).toEqual(["today", "calendar", "library", "me"]);
  });
});

describe("the parent's menu", () => {
  it("is the page about the child, the calendar, and knowledge", () => {
    expect(shape("parent")).toEqual([
      [null, ["child", "calendar"]],
      ["knowledge", ["guides", "help"]],
    ]);
    expect(menuItems("parent", OFF)[0]).toEqual({ key: "child", href: "/parents" });
    expect(homeHref("parent")).toBe("/parents");
  });

  it("keeps Klubmester when the club keeps one", () => {
    expect(shape("parent", ON)).toEqual([
      [null, ["child", "calendar"]],
      ["team", ["club"]],
      ["knowledge", ["guides", "help"]],
    ]);
  });

  it("holds neither the library, the season nor Rulle", () => {
    for (const flags of EVERY_FLAGS) {
      const keys = keysOf("parent", flags);
      for (const key of ["library", "season", "rulle", "riders", "coaches", "today"] as const) {
        expect(keys).not.toContain(key);
      }
    }
  });

  it("has the child, the calendar and Viden in the bar", () => {
    expect(barOf("parent")).toEqual(["child", "calendar", "guides"]);
    expect(barItems("parent")[2]!.href).toBe("/guides");
  });
});

describe("the member's menu", () => {
  it("is today, the calendar, and knowledge", () => {
    for (const flags of [OFF, ON]) {
      expect(shape("member", flags)).toEqual([
        [null, ["today", "calendar"]],
        ["knowledge", ["guides", "help"]],
      ]);
    }
    expect(barOf("member")).toEqual(["today", "calendar"]);
  });
});

describe("every menu", () => {
  it("starts with the day without a header, and never leaves an empty group", () => {
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const groups = menuGroups(role, flags);
        expect(groups[0]!.key).toBeNull();
        expect(groups.slice(1).every((g) => g.key !== null)).toBe(true);
        expect(groups.every((g) => g.items.length > 0)).toBe(true);
      }
    }
  });

  it("closes with knowledge: the open guides and calculators, then Help last", () => {
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const last = menuGroups(role, flags).at(-1)!;
        expect(last.key).toBe("knowledge");
        expect(last.items[0]).toEqual({ key: "guides", href: "/guides" });
        expect(last.items.at(-1)?.key).toBe("help");
      }
    }
  });

  it("holds each place once, and its groups in the one order", () => {
    const order: NavGroupKey[] = ["planning", "training", "team", "tools", "knowledge"];
    for (const role of ROLES) {
      for (const flags of EVERY_FLAGS) {
        const keys = keysOf(role, flags);
        expect(new Set(keys).size).toBe(keys.length);
        const headers = menuGroups(role, flags)
          .map((g) => g.key)
          .filter((k): k is NavGroupKey => k !== null);
        expect(headers).toEqual([...headers].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
      }
    }
  });

  it("has a bar of two to four places, each also in the menu", () => {
    for (const role of ROLES) {
      const bar = barItems(role);
      expect(bar.length).toBeGreaterThanOrEqual(2);
      expect(bar.length).toBeLessThanOrEqual(4);
      for (const flags of EVERY_FLAGS) {
        const menu = menuItems(role, flags).map((i) => i.href);
        for (const item of bar) expect(menu).toContain(item.href);
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
      const nav = messages.app.nav as Record<string, unknown> & { groups: Record<string, string> };
      for (const role of ROLES) {
        for (const flags of EVERY_FLAGS) {
          for (const group of menuGroups(role, flags)) {
            if (group.key) expect(nav.groups[group.key]).toEqual(expect.any(String));
            for (const item of group.items) expect(nav[item.key]).toEqual(expect.any(String));
          }
        }
        for (const item of barItems(role)) {
          expect(nav[barLabelKey(item.key)]).toEqual(expect.any(String));
        }
      }
    }
  });

  it("names the open guides in the bar by a word that fits", () => {
    expect(barLabelKey("guides")).toBe("guidesShort");
    expect(barLabelKey("today")).toBe("today");
    expect(da.app.nav.guidesShort).toBe("Viden");
  });
});

describe("the active place", () => {
  it("is the page or a page under it, never a neighbour sharing a prefix", () => {
    expect(isActive("/calendar", "/calendar")).toBe(true);
    expect(isActive("/calendar/session/abc", "/calendar")).toBe(true);
    expect(isActive("/club", "/coaches")).toBe(false);
    expect(isActive("/library-old", "/library")).toBe(false);
  });

  it("is the closest match, so the coach guide is lit and Help is not", () => {
    const hrefs = menuItems("coach", ON).map((i) => i.href);
    expect(activeHref("/help/coach", hrefs)).toBe("/help/coach");
    expect(activeHref("/help", hrefs)).toBe("/help");
    expect(activeHref("/calendar/session/abc", hrefs)).toBe("/calendar");
    expect(activeHref("/settings/me", hrefs)).toBeNull();
  });
});
