import type { ProviderId } from "@/modules/devices/providers";

/**
 * The rider's first steps on Today (docs/adr/0062), as plain data: which
 * steps there are, which are done, and — for "Hvad kører du med?" — the
 * ways a ride reaches Kadence on this installation and in this browser.
 * A step is done from real state where Kadence has it (a connected
 * device, a ride already in, thresholds, a parent waiting) and from what
 * the rider said on this device where it has not (the choice of device,
 * "spring over", "det har jeg gjort"), which the browser keeps.
 *
 * Pure: no DOM, no database.
 */

export const DEVICE_CHOICES = ["garmin", "wahoo", "polar", "strava", "none"] as const;
export type DeviceChoice = (typeof DEVICE_CHOICES)[number];

export const isDeviceChoice = (value: unknown): value is DeviceChoice =>
  typeof value === "string" && (DEVICE_CHOICES as readonly string[]).includes(value);

/** One way a ride gets into Kadence. */
export type Way =
  | { kind: "connect"; provider: ProviderId }
  | { kind: "folder" }
  | { kind: "upload" }
  | { kind: "stravaArchive" }
  | { kind: "byHand" };

/**
 * The ways that work for this choice here: connecting the provider only
 * where the installation has its keys, the device's folder only for a
 * Garmin (it shows up as a drive) and only where the browser can be handed
 * a folder, a file always, and a Strava archive once for the history.
 */
export function waysFor(
  choice: DeviceChoice,
  can: { configured: readonly ProviderId[]; folder: boolean },
): Way[] {
  if (choice === "none") return [{ kind: "byHand" }];
  if (choice === "strava") return [{ kind: "stravaArchive" }, { kind: "upload" }];
  const ways: Way[] = [];
  if (can.configured.includes(choice)) ways.push({ kind: "connect", provider: choice });
  if (choice === "garmin" && can.folder) ways.push({ kind: "folder" });
  ways.push({ kind: "upload" });
  return ways;
}

export type StepKey = "device" | "thresholds" | "guardian" | "homeScreen";
export type Step = { key: StepKey; done: boolean };

export type ChecklistState = {
  device: {
    choice: DeviceChoice | null;
    /** The rider pressed "Klar" under the ways. */
    settled: boolean;
    /** A Wahoo, Garmin or Polar is connected. */
    connected: boolean;
    /** A ride is already in Kadence. */
    hasRides: boolean;
  };
  thresholds: { set: boolean; skipped: boolean };
  /** Parents whose link waits for the rider's yes. */
  guardiansWaiting: number;
  homeScreen: { installed: boolean; settled: boolean };
};

export function checklistSteps(state: ChecklistState): Step[] {
  const { device, thresholds, homeScreen } = state;
  const steps: Step[] = [
    {
      key: "device",
      done: device.connected || device.hasRides || (device.choice !== null && device.settled),
    },
    { key: "thresholds", done: thresholds.set || thresholds.skipped },
  ];
  // Only when there is a parent to say yes to; most riders never see it.
  if (state.guardiansWaiting > 0) steps.push({ key: "guardian", done: false });
  steps.push({ key: "homeScreen", done: homeScreen.installed || homeScreen.settled });
  return steps;
}

/** Shown while a step is left, until the rider hides it. */
export function checklistOpen(steps: Step[], dismissed: boolean): boolean {
  return !dismissed && steps.some((s) => !s.done);
}

/** The step to open: the first one not done. */
export function currentStep(steps: Step[]): StepKey | null {
  return steps.find((s) => !s.done)?.key ?? null;
}

/** What the browser keeps of the checklist, one record per person. */
export type ChecklistMemory = {
  choice: DeviceChoice | null;
  deviceSettled: boolean;
  thresholdsSkipped: boolean;
  homeSettled: boolean;
  dismissed: boolean;
};

export const EMPTY_MEMORY: ChecklistMemory = {
  choice: null,
  deviceSettled: false,
  thresholdsSkipped: false,
  homeSettled: false,
  dismissed: false,
};

/** The stored record read back; anything that is not one reads as nothing said yet. */
export function readMemory(raw: string | null): ChecklistMemory {
  if (!raw) return EMPTY_MEMORY;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_MEMORY;
  }
  if (typeof value !== "object" || value === null) return EMPTY_MEMORY;
  const v = value as Record<string, unknown>;
  return {
    choice: isDeviceChoice(v.choice) ? v.choice : null,
    deviceSettled: v.deviceSettled === true,
    thresholdsSkipped: v.thresholdsSkipped === true,
    homeSettled: v.homeSettled === true,
    dismissed: v.dismissed === true,
  };
}

export type Platform = "installed" | "ios" | "android" | "other";

/**
 * Where Kadence is open, for the words about the home screen: already
 * installed, an iPhone or iPad (Safari's "Del → Føj til hjemmeskærm"), an
 * Android phone (Chrome's own install), or anything else. An iPad that
 * calls itself a Mac is told by its touch points.
 */
export function platformOf(input: {
  standalone: boolean;
  userAgent: string;
  maxTouchPoints: number;
}): Platform {
  if (input.standalone) return "installed";
  const ua = input.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && input.maxTouchPoints > 1))
    return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
