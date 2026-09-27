"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { CLASS_BASES } from "@/modules/dcu";
import {
  createSeasonPlan,
  deleteSeasonPlan,
  resetSeasonPlan,
  saveSeasonMonths,
  SeasonMonthsInput,
} from "./plans";

/** The season plan's server actions; the season page and the calendar are refreshed after. */

const PATHS = ["/season", "/calendar", "/today"];
const id = z.string().min(1).max(100);

export async function createSeasonPlanAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      riderId: id,
      seasonStartYear: z.number().int().min(2020).max(2100),
      basis: z.enum(CLASS_BASES).optional(),
    }),
    (ctx, input) => createSeasonPlan(ctx, input.riderId, input.seasonStartYear, input.basis),
    PATHS,
  );
}

export async function saveSeasonMonthsAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      planId: id,
      months: SeasonMonthsInput,
      note: z.string().trim().max(2000).default(""),
    }),
    (ctx, input) => saveSeasonMonths(ctx, input.planId, input.months, input.note),
    PATHS,
  );
}

export async function resetSeasonPlanAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ planId: id, basis: z.enum(CLASS_BASES) }),
    (ctx, input) => resetSeasonPlan(ctx, input.planId, input.basis),
    PATHS,
  );
}

export async function deleteSeasonPlanAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ planId: id }),
    (ctx, input) => deleteSeasonPlan(ctx, input.planId),
    PATHS,
  );
}
