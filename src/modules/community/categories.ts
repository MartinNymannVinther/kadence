/**
 * Trænerrummet's categories (docs/adr/0052), shared by the service and the
 * composer in the browser. Pure: imports nothing from the database.
 */
export const CATEGORIES = [
  "training",
  "strength",
  "wellbeing",
  "races",
  "equipment",
  "dcu",
] as const;
export type Category = (typeof CATEGORIES)[number];
