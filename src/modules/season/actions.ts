"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { todayInCopenhagen } from "@/core/dates";
import { CLASS_BASES } from "@/modules/dcu";
import {
  createSeasonPlan,
  deleteSeasonPlan,
  resetSeasonPlan,
  saveSeasonMonths,
  SeasonMonthsInput,
} from "./plans";
import { previewPlan } from "./preview";
import { createTeamSeasonPlans } from "./team-plans";
import { monthsBetween } from "./volume";

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

/** A plan for every rider on the team who has none for the season; a coach's. */
export async function createTeamSeasonPlansAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ seasonStartYear: z.number().int().min(2020).max(2100) }),
    (ctx, input) => createTeamSeasonPlans(ctx, input.seasonStartYear),
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

/**
 * What new sessions would do to each rider's four numbers, month by month,
 * before they are made (ADR 0041): the same sessions for every rider, as
 * a series puts them. A read; nothing is written.
 */
export async function previewSessionsAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      riderIds: z.array(id).min(1).max(60),
      sessions: z
        .array(
          z.object({
            onDate: z.iso.date(),
            sport: z.enum(["bike", "strength", "other"]),
            plannedMinutes: z.number().int().min(0).max(1440),
          }),
        )
        .min(1)
        .max(400),
    }),
    (ctx, input) => {
      const dates = input.sessions.map((s) => s.onDate).sort();
      return previewPlan(ctx, {
        riderIds: input.riderIds,
        additions: () => input.sessions,
        periods: monthsBetween(dates[0]!, dates.at(-1)!),
        today: todayInCopenhagen(),
      });
    },
    [],
  );
}
