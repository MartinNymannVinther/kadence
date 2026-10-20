import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The actions an expired workspace may still run (docs/adr/0090): every
 * server action goes through runAction, which refuses a workspace that
 * may only be read, unless the action passes STILL_ALLOWED. Each name
 * here is an argument somebody made: it reads, it leaves, or it takes
 * something away (consent, a link, a key, a ride, a rider's data, a
 * parent's access). An action that adds or changes something is never
 * here. A new name has to be argued for in a pull request.
 */
const STILL_ALLOWED = {
  // Reading: a preview writes nothing, the search reads what the caller may read.
  "src/modules/training/block-actions.ts": ["previewBlockAction"],
  "src/modules/training/week-actions.ts": [
    "previewCopyWeekAction",
    "previewWeekPlanAction",
    "loadPreviousWeekAction",
  ],
  "src/modules/training/week-draft-actions.ts": ["loadWeekPlanDraftAction"],
  "src/modules/training/own-ride-actions.ts": ["moreOwnRidesAction"],
  "src/modules/search/actions.ts": ["searchIndexAction"],
  "src/modules/season/actions.ts": ["previewSessionsAction"],
  "src/modules/push/actions.ts": ["reminderStateAction", "unsubscribeRemindersAction"],
  // Leaving, and taking one's training along (ADR 0081).
  "src/core/team/actions.ts": ["leaveWithHistoryAction", "acceptWithHistoryAction"],
  // Taking away: a rider's erasure, a parent's access, consent to health
  // data, a device link, an upload key, a ride.
  "src/modules/team/actions.ts": ["eraseRiderAction", "removeGuardianAction"],
  "src/modules/consent/actions.ts": ["withdrawHealthConsentAction"],
  "src/modules/devices/actions.ts": [
    "disconnectAction",
    "removeUploadKeyAction",
    "deleteActivityAction",
  ],
} as const;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
  });
}

/** The exported actions of a file that pass STILL_ALLOWED, by name. */
function allowedIn(source: string): string[] {
  const parts = source.split(/(?=^export async function )/m).slice(1);
  return parts
    .filter((part) => part.includes("STILL_ALLOWED"))
    .map((part) => /^export async function (\w+)/.exec(part)![1]!);
}

describe("the actions an expired workspace may run", () => {
  it("are exactly the named ones", () => {
    const found: Record<string, string[]> = {};
    for (const path of files("src")) {
      const source = readFileSync(path, "utf8");
      if (!source.startsWith('"use server"')) continue;
      const allowed = allowedIn(source);
      if (allowed.length > 0) found[path] = allowed.sort();
    }
    const expected = Object.fromEntries(
      Object.entries(STILL_ALLOWED).map(([path, names]) => [path, [...names].sort()]),
    );
    expect(found).toEqual(expected);
  });

  it("include no action whose name says it adds or changes something", () => {
    const names = Object.values(STILL_ALLOWED).flat();
    for (const name of names)
      expect(name, name).not.toMatch(/^(create|add|save|update|apply|copy|schedule|invite|set)/);
  });
});
