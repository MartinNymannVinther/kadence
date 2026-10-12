import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyProposal, proposedKeys, type ThresholdFields } from "@/modules/load/threshold-apply";
import type { ThresholdEstimates } from "@/modules/load/threshold-estimate";
import type { Estimate } from "@/modules/load/threshold-shared";

/**
 * "Brug forslaget" fills the form and saves nothing (docs/adr/0094): only
 * ticked numbers, only proposed numbers, and the panel never calls the
 * action that saves.
 */

const est = (value: number | null): Estimate => ({
  value,
  method: value === null ? null : "best20Power",
  windowDays: value === null ? null : 90,
  confidence: value === null ? null : "medium",
  sources: [],
  missing: value === null ? "noPower" : null,
  notes: [],
});
const estimates: ThresholdEstimates = {
  ftpWatts: est(265),
  thresholdHr: est(172),
  maxHr: est(null),
  restingHr: est(null),
};
const fields: ThresholdFields = {
  ftpWatts: 240,
  thresholdHr: null,
  maxHr: 194,
  restingHr: 50,
  thresholdsOn: "2026-03-01",
};

describe("using the proposal", () => {
  it("opens with every proposed number ticked", () => {
    expect(proposedKeys(estimates)).toEqual(["ftpWatts", "thresholdHr"]);
  });

  it("fills the ticked numbers and dates them today", () => {
    expect(applyProposal(fields, estimates, ["ftpWatts", "thresholdHr"], "2026-10-12")).toEqual({
      ...fields,
      ftpWatts: 265,
      thresholdHr: 172,
      thresholdsOn: "2026-10-12",
    });
  });

  it("leaves an unticked number as it was", () => {
    expect(applyProposal(fields, estimates, ["thresholdHr"], "2026-10-12")).toMatchObject({
      ftpWatts: 240,
      thresholdHr: 172,
    });
  });

  it("never empties a field that had no proposal, and changes nothing with nothing ticked", () => {
    expect(applyProposal(fields, estimates, ["maxHr", "restingHr"], "2026-10-12")).toEqual(fields);
    expect(applyProposal(fields, estimates, [], "2026-10-12")).toEqual(fields);
  });

  it("is never saved by the panel itself", () => {
    const panel = readFileSync("src/components/team/threshold-proposal-panel.tsx", "utf8");
    expect(panel).not.toMatch(/setThresholds/);
    expect(panel).toMatch(/proposeThresholdsAction/);
  });
});
