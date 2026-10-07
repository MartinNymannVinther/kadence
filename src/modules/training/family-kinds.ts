/**
 * What a parent may put into their child's calendar (docs/adr/0069): a
 * holiday, an exam or something else — the family's days, never a race,
 * a camp, school or a week ill. The database holds the same list in its
 * policies (drizzle/0040).
 *
 * Pure: the parents' dialog in the browser reads it too.
 */

export const FAMILY_KINDS = ["holiday", "exam", "other"] as const;
export type FamilyKind = (typeof FAMILY_KINDS)[number];

export const isFamilyKind = (kind: string): kind is FamilyKind =>
  (FAMILY_KINDS as readonly string[]).includes(kind);

/** One of the parent's own entries, as the parents' page lists it. */
export type FamilyEvent = {
  id: string;
  riderId: string;
  kind: FamilyKind;
  title: string;
  startsOn: string;
  endsOn: string;
};
