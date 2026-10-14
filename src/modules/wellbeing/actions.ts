"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { CheckinInput, saveCheckin } from "./checkins";
import {
  addKnownPain,
  changeKnownPain,
  KnownPainChange,
  KnownPainId,
  KnownPainInput,
  removeKnownPain,
} from "./known-pains";
import { addMeasurement, deleteMeasurement, MeasurementInput } from "./measurements";

/** The check-in's, the known pains' and the measurements' server actions. */

const PATHS = ["/today", "/calendar", "/riders", "/me"];

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

export async function addKnownPainAction(raw: unknown) {
  return runAction(raw, KnownPainInput, addKnownPain, PATHS);
}

export async function changeKnownPainAction(raw: unknown) {
  return runAction(raw, KnownPainChange, changeKnownPain, PATHS);
}

export async function removeKnownPainAction(raw: unknown) {
  return runAction(
    raw,
    KnownPainId,
    (ctx, input) => removeKnownPain(ctx, input.knownPainId),
    PATHS,
  );
}
