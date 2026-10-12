"use server";

import { z } from "zod";
import { runAction, STILL_ALLOWED } from "@/core/action";
import { copyWeek, CopyWeekInput, previewCopyWeek } from "./week-copy";
import { applyWeekPlan, previewWeekPlan, WeekPlanInput } from "./week-plan";
import { loadPreviousWeek } from "./week-plan-load";

/** Planning a whole week at once: the calendar and today's page are refreshed after. */

const PATHS = ["/calendar", "/today", "/season"];

export async function previewCopyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, previewCopyWeek, [], STILL_ALLOWED);
}

export async function copyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, copyWeek, PATHS);
}

export async function previewWeekPlanAction(raw: unknown) {
  return runAction(raw, WeekPlanInput, previewWeekPlan, [], STILL_ALLOWED);
}

export async function applyWeekPlanAction(raw: unknown) {
  return runAction(raw, WeekPlanInput, applyWeekPlan, PATHS);
}

/** "Start fra: Sidste uge" in the planner (ADR 0059): nothing is written. */
export async function loadPreviousWeekAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      riderIds: z.array(z.string().min(1).max(100)).min(1).max(60),
      monday: z.iso.date(),
    }),
    loadPreviousWeek,
    [],
    STILL_ALLOWED,
  );
}
