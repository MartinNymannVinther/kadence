import { describe, expect, it } from "vitest";
import {
  checklistOpen,
  checklistSteps,
  currentStep,
  EMPTY_MEMORY,
  platformOf,
  readMemory,
  waysFor,
  type ChecklistState,
} from "@/components/today/checklist-steps";

/**
 * The rider's first steps on Today (docs/adr/0063), without React or a
 * browser: which steps there are, which are done from what Kadence knows
 * and what the rider said, which ways a ride gets in for each answer, and
 * what the browser keeps.
 */

const fresh: ChecklistState = {
  device: { choice: null, settled: false, connected: false, hasRides: false },
  thresholds: { set: false, skipped: false },
  guardiansWaiting: 0,
  homeScreen: { installed: false, settled: false },
};

const keys = (state: ChecklistState) => checklistSteps(state).map((s) => s.key);

describe("the steps", () => {
  it("are three for a new rider with nobody waiting, none done", () => {
    const steps = checklistSteps(fresh);
    expect(steps).toEqual([
      { key: "device", done: false },
      { key: "thresholds", done: false },
      { key: "homeScreen", done: false },
    ]);
    expect(currentStep(steps)).toBe("device");
    expect(checklistOpen(steps, false)).toBe(true);
  });

  it("ask about a parent only while one waits for the rider's yes", () => {
    expect(keys({ ...fresh, guardiansWaiting: 1 })).toEqual([
      "device",
      "thresholds",
      "guardian",
      "homeScreen",
    ]);
    expect(checklistSteps({ ...fresh, guardiansWaiting: 2 })[2]).toEqual({
      key: "guardian",
      done: false,
    });
  });

  it("take the device as done from a connected device or a ride already in", () => {
    const connected = { ...fresh, device: { ...fresh.device, connected: true } };
    const rides = { ...fresh, device: { ...fresh.device, hasRides: true } };
    expect(checklistSteps(connected)[0]!.done).toBe(true);
    expect(checklistSteps(rides)[0]!.done).toBe(true);
  });

  it("take a choice as done only once the rider says it is in place", () => {
    const chosen = { ...fresh, device: { ...fresh.device, choice: "garmin" as const } };
    expect(checklistSteps(chosen)[0]!.done).toBe(false);
    const settled = { ...chosen, device: { ...chosen.device, settled: true } };
    expect(checklistSteps(settled)[0]!.done).toBe(true);
    // "Klar" with nothing chosen is not an answer.
    const empty = { ...fresh, device: { ...fresh.device, settled: true } };
    expect(checklistSteps(empty)[0]!.done).toBe(false);
  });

  it("take thresholds as done when set or skipped", () => {
    expect(checklistSteps({ ...fresh, thresholds: { set: true, skipped: false } })[1]!.done).toBe(
      true,
    );
    expect(checklistSteps({ ...fresh, thresholds: { set: false, skipped: true } })[1]!.done).toBe(
      true,
    );
  });

  it("take the home screen as done when installed or said", () => {
    const installed = { ...fresh, homeScreen: { installed: true, settled: false } };
    expect(checklistSteps(installed).at(-1)!.done).toBe(true);
    const said = { ...fresh, homeScreen: { installed: false, settled: true } };
    expect(checklistSteps(said).at(-1)!.done).toBe(true);
  });

  it("open the first one not done, and close when all are done or it is hidden", () => {
    const halfway: ChecklistState = {
      ...fresh,
      device: { ...fresh.device, connected: true },
      guardiansWaiting: 1,
    };
    expect(currentStep(checklistSteps(halfway))).toBe("thresholds");
    const done: ChecklistState = {
      ...fresh,
      device: { ...fresh.device, hasRides: true },
      thresholds: { set: true, skipped: false },
      homeScreen: { installed: true, settled: false },
    };
    const steps = checklistSteps(done);
    expect(currentStep(steps)).toBeNull();
    expect(checklistOpen(steps, false)).toBe(false);
    expect(checklistOpen(checklistSteps(fresh), true)).toBe(false);
  });
});

describe("the ways a ride gets in", () => {
  const nothing = { configured: [] as const, folder: false };

  it("connect a provider only where the installation has its keys", () => {
    expect(waysFor("wahoo", nothing)).toEqual([{ kind: "upload" }]);
    expect(waysFor("wahoo", { configured: ["wahoo"], folder: true })).toEqual([
      { kind: "connect", provider: "wahoo" },
      { kind: "upload" },
    ]);
    expect(waysFor("polar", { configured: ["wahoo", "garmin"], folder: false })).toEqual([
      { kind: "upload" },
    ]);
  });

  it("read a Garmin's folder only where the browser can be handed one", () => {
    expect(waysFor("garmin", { configured: ["garmin"], folder: true })).toEqual([
      { kind: "connect", provider: "garmin" },
      { kind: "folder" },
      { kind: "upload" },
    ]);
    expect(waysFor("garmin", nothing)).toEqual([{ kind: "upload" }]);
  });

  it("give Strava's archive once and files after, and a rider without a computer Udført", () => {
    expect(waysFor("strava", { configured: ["garmin"], folder: true })).toEqual([
      { kind: "stravaArchive" },
      { kind: "upload" },
    ]);
    expect(waysFor("none", { configured: ["garmin"], folder: true })).toEqual([{ kind: "byHand" }]);
  });
});

describe("what the browser keeps", () => {
  it("reads back what was written", () => {
    const kept = JSON.stringify({ ...EMPTY_MEMORY, choice: "polar", homeSettled: true });
    expect(readMemory(kept)).toEqual({ ...EMPTY_MEMORY, choice: "polar", homeSettled: true });
  });

  it("reads anything else as nothing said yet", () => {
    expect(readMemory(null)).toEqual(EMPTY_MEMORY);
    expect(readMemory("not json")).toEqual(EMPTY_MEMORY);
    expect(readMemory("[1,2]")).toMatchObject({ choice: null, dismissed: false });
    expect(readMemory(JSON.stringify({ choice: "shimano", dismissed: "yes" }))).toEqual(
      EMPTY_MEMORY,
    );
  });
});

describe("the platform", () => {
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1";
  const ipad =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  const android =
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

  it("is told from the browser", () => {
    expect(platformOf({ standalone: false, userAgent: iphone, maxTouchPoints: 5 })).toBe("ios");
    expect(platformOf({ standalone: false, userAgent: ipad, maxTouchPoints: 5 })).toBe("ios");
    expect(platformOf({ standalone: false, userAgent: android, maxTouchPoints: 5 })).toBe(
      "android",
    );
    expect(platformOf({ standalone: false, userAgent: mac, maxTouchPoints: 0 })).toBe("other");
  });

  it("is installed whatever the phone, once Kadence runs on its own", () => {
    expect(platformOf({ standalone: true, userAgent: iphone, maxTouchPoints: 5 })).toBe(
      "installed",
    );
  });
});
