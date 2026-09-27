/** What the season page hands its client components: plain rows, no services. */

export type PlanMonth = { month: number; hours: number; phase: string; note: string };

export type SeasonPlanData = {
  id: string;
  basis: string;
  months: PlanMonth[];
  /** DCU's hours for each month of the basis, in the plan's order. */
  dcu: number[];
  note: string;
};

export type RiddenData = Array<{ month: number; hours: number }>;
