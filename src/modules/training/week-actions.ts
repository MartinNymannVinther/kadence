"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { copyWeek, CopyWeekInput, previewCopyWeek } from "./week-copy";
import { applyWeekPlan, loadRiderWeek, previewWeekPlan, WeekPlanInput } from "./week-plan";

/** Planning a whole week at once: the calendar and today's page are refreshed after. */

const PATHS = ["/calendar", "/today", "/season"];

export async function previewCopyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, previewCopyWeek, []);
}

export async function copyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, copyWeek, PATHS);
}

export async function previewWeekPlanAction(raw: unknown) {
  return runAction(raw, WeekPlanInput, previewWeekPlan, []);
}

export async function applyWeekPlanAction(raw: unknown) {
  return runAction(raw, WeekPlanInput, applyWeekPlan, PATHS);
}

export async function loadRiderWeekAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: z.string().min(1).max(100), monday: z.iso.date() }),
    loadRiderWeek,
    [],
  );
}
