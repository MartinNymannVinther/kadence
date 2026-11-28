/**
 * Why a session was moved or skipped, in one tap (docs/adr/0117): the
 * words are under `changes.reason` in the messages. Pure, so the picker in
 * the browser and the schema read the same list.
 */
export const CHANGE_REASONS = [
  "ill",
  "pain",
  "tired",
  "school",
  "weather",
  "time",
  "travel",
  "other",
] as const;
export type ChangeReason = (typeof CHANGE_REASONS)[number];

export const CHANGE_KINDS = ["moved", "skipped", "unskipped"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
