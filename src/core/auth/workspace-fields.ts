/**
 * A workspace's columns that are ours to set, never a request's: what it
 * is (docs/adr/0080) and what it pays (docs/adr/0090), in either spelling.
 */
const SERVER_ONLY_FIELDS = [
  "kind",
  "plan",
  "pricePlan",
  "price_plan",
  "trialEndsAt",
  "trial_ends_at",
  "paidUntil",
  "paid_until",
  "freeReason",
  "free_reason",
  "freeUntil",
  "free_until",
];

/** Whether a request body tries to say what a workspace is or pays, at its top or in `data`. */
export function bodyNamesKind(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const data = (body as { data?: unknown }).data;
  return SERVER_ONLY_FIELDS.some(
    (field) =>
      Object.hasOwn(body, field) ||
      Boolean(data && typeof data === "object" && Object.hasOwn(data, field)),
  );
}
