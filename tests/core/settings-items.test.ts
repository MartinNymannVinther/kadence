import { describe, expect, it } from "vitest";
import {
  settingsItems,
  settingsSubtitle,
} from "@/app/[locale]/(app)/(narrow)/settings/settings-items";

/**
 * The settings tabs by role (docs/adr/0061), moved here from the menu's
 * tests so each list has a file of its own.
 */

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
