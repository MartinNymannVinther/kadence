import { describe, expect, it } from "vitest";
import {
  barItems,
  homeHref,
  isActive,
  menuItems,
  navFlags,
  navRole,
  type NavFlags,
  type NavRole,
} from "@/app/[locale]/(app)/nav-items";
import {
  settingsItems,
  settingsSubtitle,
} from "@/app/[locale]/(app)/(narrow)/settings/settings-items";

/**
 * One menu per role (docs/adr/0061): the lists are the decision, so the
 * tests hold each role to its own, in order, with the installation's and
 * the club's switches on and off.
 */

const OFF: NavFlags = { club: false, coachesRoom: false, rides: false, parent: false };
const ON: NavFlags = { club: true, coachesRoom: true, rides: false, parent: false };

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
  it("plans first and keeps the parked parts out while they are off", () => {
    expect(keysOf("coach")).toEqual([
      "today",
      "calendar",
      "riders",
      "library",
      "season",
      "parents",
      "rulle",
      "help",
    ]);
  });

  it("gains Klubmester and Trænerrummet when they are on, before Help", () => {
    expect(keysOf("coach", ON)).toEqual([
      "today",
      "calendar",
      "riders",
      "library",
      "season",
      "parents",
      "rulle",
      "club",
      "coaches",
      "help",
    ]);
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).toContain("coaches");
    expect(keysOf("coach", { ...OFF, coachesRoom: true })).not.toContain("club");
  });

  it("keeps the coach's own page for a coach who also rides", () => {
    expect(keysOf("coach", { ...OFF, rides: true }).slice(0, 4)).toEqual([
      "today",
      "calendar",
      "riders",
      "me",
    ]);
  });

  it("puts four places and Mere in the bar", () => {
    expect(barOf("coach")).toEqual(["today", "calendar", "riders", "library"]);
  });
});

describe("the rider's menu", () => {
  it("rides: today, the calendar, their own page, the library, the season and Rulle", () => {
    expect(keysOf("rider")).toEqual([
      "today",
      "calendar",
      "me",
      "library",
      "season",
      "rulle",
      "help",
    ]);
    expect(barOf("rider")).toEqual(["today", "calendar", "me"]);
  });

  it("never holds the coaches' places", () => {
    for (const flags of [OFF, ON]) {
      const keys = keysOf("rider", flags);
      expect(keys).not.toContain("riders");
      expect(keys).not.toContain("coaches");
    }
  });

  it("shows Klubmester when the club keeps one, the one place riders see placings", () => {
    expect(keysOf("rider", ON)).toContain("club");
  });
});

describe("the parent's menu", () => {
  it("is the page about the child, the calendar and Help", () => {
    expect(keysOf("parent")).toEqual(["child", "calendar", "help"]);
    expect(menuItems("parent", OFF)[0]).toEqual({ key: "child", href: "/parents" });
    expect(barOf("parent")).toEqual(["child", "calendar"]);
    expect(homeHref("parent")).toBe("/parents");
  });

  it("no longer holds the library, the season or Rulle", () => {
    for (const flags of [OFF, ON]) {
      const keys = keysOf("parent", flags);
      for (const key of ["library", "season", "rulle", "riders", "coaches", "today"] as const) {
        expect(keys).not.toContain(key);
      }
    }
  });
});

describe("every menu", () => {
  const roles: NavRole[] = ["coach", "rider", "parent", "member"];

  it("ends with Help and leaves the open guides to the open pages", () => {
    for (const role of roles) {
      for (const flags of [OFF, ON]) {
        const items = menuItems(role, flags);
        expect(items.at(-1)?.key).toBe("help");
        expect(items.map((i) => i.href)).not.toContain("/guides");
      }
    }
  });

  it("has a bar of at most four places, each also in the menu", () => {
    for (const role of roles) {
      const bar = barItems(role);
      expect(bar.length).toBeGreaterThanOrEqual(2);
      expect(bar.length).toBeLessThanOrEqual(4);
      const menu = menuItems(role, OFF).map((i) => i.href);
      for (const item of bar) expect(menu).toContain(item.href);
    }
  });

  it("starts at the first place in the bar", () => {
    expect(homeHref("coach")).toBe("/today");
    expect(homeHref("rider")).toBe("/today");
    expect(homeHref("member")).toBe("/today");
  });
});

describe("the active place", () => {
  it("is the page or a page under it, never a neighbour sharing a prefix", () => {
    expect(isActive("/calendar", "/calendar")).toBe(true);
    expect(isActive("/calendar/session/abc", "/calendar")).toBe(true);
    expect(isActive("/club", "/coaches")).toBe(false);
    expect(isActive("/library-old", "/library")).toBe(false);
  });
});

describe("the settings tabs", () => {
  const keys = (who: { owner: boolean; isCoach: boolean; isRider: boolean }) =>
    settingsItems(who).map((i) => i.key);

  it("keep the team's settings for coaches", () => {
    expect(keys({ owner: false, isCoach: true, isRider: false })).toEqual([
      "team",
      "me",
      "workspace",
      "security",
      "ai",
      "data",
      "about",
    ]);
  });

  it("give a rider their own things, without the workspace and AI", () => {
    expect(keys({ owner: false, isCoach: false, isRider: true })).toEqual([
      "me",
      "devices",
      "security",
      "data",
      "about",
    ]);
  });

  it("give a parent themselves, security and the way out", () => {
    expect(keys({ owner: false, isCoach: false, isRider: false })).toEqual([
      "me",
      "security",
      "data",
      "about",
    ]);
  });

  it("add admission and the installation for its owner, whatever the role", () => {
    for (const isCoach of [true, false]) {
      const list = keys({ owner: true, isCoach, isRider: !isCoach });
      expect(list).toContain("access");
      expect(list).toContain("installation");
    }
    expect(keys({ owner: false, isCoach: true, isRider: true })).not.toContain("access");
  });

  it("say who the page is for", () => {
    expect(settingsSubtitle({ isCoach: true, isRider: true })).toBe("subtitleCoach");
    expect(settingsSubtitle({ isCoach: false, isRider: true })).toBe("subtitleRider");
    expect(settingsSubtitle({ isCoach: false, isRider: false })).toBe("subtitleOther");
  });
});
