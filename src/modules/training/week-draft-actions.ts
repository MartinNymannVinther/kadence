"use server";

import { runAction, STILL_ALLOWED } from "@/core/action";
import {
  clearWeekPlanDraft,
  DraftKey,
  getWeekPlanDraft,
  saveWeekPlanDraft,
  SaveDraftInput,
} from "./week-plan-draft";

/**
 * The week planner's shared draft (ADR 0043, amended 2026-10-07): read,
 * saved a moment after each change, and cleared when the week is laid
 * in. Nothing else on the page changes with it, so nothing is refreshed.
 */

export async function loadWeekPlanDraftAction(raw: unknown) {
  return runAction(raw, DraftKey, getWeekPlanDraft, [], STILL_ALLOWED);
}

export async function saveWeekPlanDraftAction(raw: unknown) {
  return runAction(raw, SaveDraftInput, saveWeekPlanDraft, []);
}

export async function clearWeekPlanDraftAction(raw: unknown) {
  return runAction(raw, DraftKey, clearWeekPlanDraft, []);
}
