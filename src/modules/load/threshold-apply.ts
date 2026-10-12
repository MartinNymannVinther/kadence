import type { ThresholdEstimates, ThresholdKey } from "./threshold-estimate";
import { THRESHOLD_KEYS } from "./threshold-estimate";

/**
 * "Brug forslaget" (docs/adr/0094): the proposal put into the thresholds
 * form, the numbers the person kept ticked and nothing else. The form's
 * own Gem saves them, or nothing does — this only returns new field
 * values, and the date the numbers are from becomes today.
 *
 * Pure: imports nothing from the database.
 */

export type ThresholdFields = Record<ThresholdKey, number | null> & {
  thresholdsOn: string | null;
};

/** The ticks the panel opens with: every number that was proposed. */
export function proposedKeys(estimates: ThresholdEstimates): ThresholdKey[] {
  return THRESHOLD_KEYS.filter((key) => estimates[key].value !== null);
}

export function applyProposal(
  fields: ThresholdFields,
  estimates: ThresholdEstimates,
  ticked: readonly ThresholdKey[],
  today: string,
): ThresholdFields {
  const next = { ...fields };
  let changed = false;
  for (const key of ticked) {
    const value = estimates[key].value;
    if (value === null) continue;
    next[key] = value;
    changed = true;
  }
  if (changed) next.thresholdsOn = today;
  return next;
}
