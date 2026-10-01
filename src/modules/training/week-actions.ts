"use server";

import { runAction } from "@/core/action";
import { copyWeek, CopyWeekInput, previewCopyWeek } from "./week-copy";

/** Planning a whole week at once: the calendar and today's page are refreshed after. */

const PATHS = ["/calendar", "/today", "/season"];

export async function previewCopyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, previewCopyWeek, []);
}

export async function copyWeekAction(raw: unknown) {
  return runAction(raw, CopyWeekInput, copyWeek, PATHS);
}
