import { z } from "zod";
import { seasonStartYear } from "@/modules/dcu/classes";
import { getSeasonPlan } from "@/modules/season/plans";
import { text } from "../shapes";
import { defineTool, ToolRefusal } from "../tool";

export const getMySeasonPlan = defineTool({
  name: "get_my_season_plan",
  title: "My season plan",
  description:
    "The rider's season plan (sæsonplan): twelve months from October with planned hours and phase, and the guidance for each month. When the team plans by Cykling Denmark's (DCU) recommendations, `deviations` says where the plan differs from DCU's hours for the rider's class.",
  input: z.object({
    season: z
      .number()
      .int()
      .min(2020)
      .max(2100)
      .optional()
      .describe("The year the season starts in October. Default: the current season."),
  }),
  scope: "kadence:read",
  role: "rider",
  readOnly: true,
  run: async ({ ctx, riderId, today }, input) => {
    const season = input.season ?? seasonStartYear(today);
    const plan = await getSeasonPlan(ctx, riderId, season);
    if (!plan) throw new ToolRefusal(`No season plan for the season starting October ${season}.`);
    return {
      season,
      basis: plan.basis,
      guided: plan.guided,
      months: plan.months,
      deviations: plan.deviations,
      note: text(plan.note),
    };
  },
});
