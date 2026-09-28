"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { addDcuWinterGoal, addGoal, bumpGoal, deleteGoal, GoalInput } from "./goals";

/** The goals' server actions: add, DCU's winter goal, one more done, delete. */

const PATHS = ["/today", "/riders"];
const ById = z.object({ goalId: z.string().min(1).max(100) });

export async function addGoalAction(raw: unknown) {
  return runAction(raw, GoalInput, addGoal, PATHS);
}

export async function addDcuWinterGoalAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: z.string().min(1).max(100), title: z.string().trim().min(1).max(80) }),
    (ctx, input) => addDcuWinterGoal(ctx, input.riderId, input.title),
    PATHS,
  );
}

export async function bumpGoalAction(raw: unknown) {
  return runAction(
    raw,
    ById.extend({ by: z.union([z.literal(1), z.literal(-1)]) }),
    (ctx, input) => bumpGoal(ctx, input.goalId, input.by),
    PATHS,
  );
}

export async function deleteGoalAction(raw: unknown) {
  return runAction(raw, ById, (ctx, input) => deleteGoal(ctx, input.goalId), PATHS);
}
