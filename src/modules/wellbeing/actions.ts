"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { CheckinInput, saveCheckin } from "./checkins";
import { addMeasurement, deleteMeasurement, MeasurementInput } from "./measurements";

/** The check-in's and the measurements' server actions. */

const PATHS = ["/today", "/calendar", "/riders"];

export async function saveCheckinAction(raw: unknown) {
  return runAction(raw, CheckinInput, saveCheckin, PATHS);
}

export async function addMeasurementAction(raw: unknown) {
  return runAction(raw, MeasurementInput, addMeasurement, PATHS);
}

export async function deleteMeasurementAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ measurementId: z.string().min(1).max(100) }),
    (ctx, input) => deleteMeasurement(ctx, input.measurementId),
    PATHS,
  );
}
