import type { Reference } from "@/modules/paradigms";

/** What the season page hands its client components: plain rows, no services. */

export type PlanMonth = { month: number; hours: number; phase: string; note: string };

export type SeasonPlanData = {
  id: string;
  basis: string;
  months: PlanMonth[];
  /**
   * DCU's hours for each month of the basis, in the plan's order; null when
   * the team plans without DCU (ADR 0049).
   */
  dcu: number[] | null;
  /** Whose hours `dcu` is: DCU's, or a senior's training profile's (docs/adr/0091). */
  reference: Reference;
  note: string;
};

export type RiddenData = Array<{ month: number; hours: number }>;
