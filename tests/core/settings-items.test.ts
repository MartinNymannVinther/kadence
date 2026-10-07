import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  settingsGroups,
  settingsItems,
  settingsSubtitle,
} from "@/app/[locale]/(app)/(narrow)/settings/settings-items";

/**
 * The settings tabs, by role and grouped by whose they are (docs/adr/0061,
 * amended by 0068): Dig, Holdet for coaches, Installationen for the
 * installation's owner, and Om last on its own.
 */

type Who = { owner: boolean; isCoach: boolean; isRider: boolean };

const shape = (who: Who) => settingsGroups(who).map((g) => [g.key, g.items.map((i) => i.key)]);

const COACH: Who = { owner: false, isCoach: true, isRider: false };
const RIDER: Who = { owner: false, isCoach: false, isRider: true };
const PARENT: Who = { owner: false, isCoach: false, isRider: false };
const EVERYONE: Who[] = [
  COACH,
  RIDER,
  PARENT,
  { owner: false, isCoach: true, isRider: true },
  { owner: true, isCoach: true, isRider: false },
  { owner: true, isCoach: false, isRider: true },
];

describe("the settings groups", () => {
  it("give a coach their own things first, then the team's, with its data", () => {
    expect(shape(COACH)).toEqual([
      ["you", ["me", "security"]],
      ["team", ["team", "workspace", "ai", "data"]],
      [null, ["about"]],
    ]);
  });

  it("give a coach who rides their devices among their own things", () => {
    expect(shape({ ...COACH, isRider: true })[0]).toEqual(["you", ["me", "devices", "security"]]);
  });

  it("give a rider their own things and the way out, without the team's", () => {
    expect(shape(RIDER)).toEqual([
      ["you", ["me", "devices", "security", "data"]],
      [null, ["about"]],
    ]);
  });

  it("give a parent themselves, security and the way out", () => {
    expect(shape(PARENT)).toEqual([
      ["you", ["me", "security", "data"]],
      [null, ["about"]],
    ]);
  });

  it("add the installation's group for its owner, whatever the role, before Om", () => {
    for (const isCoach of [true, false]) {
      const groups = shape({ owner: true, isCoach, isRider: !isCoach });
      expect(groups.at(-2)).toEqual(["installation", ["access", "installation"]]);
      expect(groups.at(-1)).toEqual([null, ["about"]]);
    }
    for (const who of [COACH, RIDER, PARENT]) {
      expect(settingsItems(who).map((i) => i.key)).not.toContain("access");
    }
  });

  it("keep Data for everyone, once, and every tab at its own address", () => {
    for (const who of EVERYONE) {
      const items = settingsItems(who);
      expect(items.filter((i) => i.key === "data")).toHaveLength(1);
      for (const item of items) expect(item.href).toBe(`/settings/${item.key}`);
      expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
    }
  });

  it("have every header and tab in both languages", () => {
    for (const messages of [da, en]) {
      const nav = messages.settings.nav as Record<string, unknown> & {
        groups: Record<string, string>;
      };
      for (const who of EVERYONE) {
        for (const group of settingsGroups(who)) {
          if (group.key) expect(nav.groups[group.key]).toEqual(expect.any(String));
          for (const item of group.items) expect(nav[item.key]).toEqual(expect.any(String));
        }
      }
    }
    expect(da.settings.nav.groups).toEqual({
      you: "Dig",
      team: "Holdet",
      installation: "Installationen",
    });
  });
});

describe("the settings subtitle", () => {
  it("says who the page is for", () => {
    expect(settingsSubtitle({ isCoach: true, isRider: true })).toBe("subtitleCoach");
    expect(settingsSubtitle({ isCoach: false, isRider: true })).toBe("subtitleRider");
    expect(settingsSubtitle({ isCoach: false, isRider: false })).toBe("subtitleOther");
  });
});
