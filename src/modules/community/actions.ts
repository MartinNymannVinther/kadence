"use server";

import { z } from "zod";
import { runFeatureAction } from "@/core/feature-gate";
import { handleReport, report, setHidden, setLocked } from "./moderation";
import { CATEGORIES, createThread, reply, takeWorkout } from "./service";

/**
 * Trænerrummet's actions (docs/adr/0052): each resolves the session and
 * team first, and each is refused while the installation has the room off
 * (docs/adr/0056).
 */

const ROOM = ["/coaches"];
const id = z.string().min(1).max(100);
const target = z.enum(["thread", "post"]);

export async function createThreadAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({
      category: z.enum(CATEGORIES),
      title: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(8000),
      templateId: id.nullable().optional(),
    }),
    createThread,
    ROOM,
  );
}

export async function replyAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ threadId: id, body: z.string().trim().min(1).max(8000) }),
    (ctx, input) => reply(ctx, input.threadId, input.body),
    ROOM,
  );
}

export async function takeWorkoutAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ threadId: id }),
    (ctx, input) => takeWorkout(ctx, input.threadId),
    [...ROOM, "/library"],
  );
}

export async function reportAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ targetKind: target, targetId: id, reason: z.string().trim().max(500).default("") }),
    report,
    ROOM,
  );
}

export async function setHiddenAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ targetKind: target, targetId: id, hidden: z.boolean() }),
    setHidden,
    ROOM,
  );
}

export async function setLockedAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ threadId: id, locked: z.boolean() }),
    (ctx, input) => setLocked(ctx, input.threadId, input.locked),
    ROOM,
  );
}

export async function handleReportAction(raw: unknown) {
  return runFeatureAction(
    "coachesRoom",
    raw,
    z.object({ reportId: id }),
    (ctx, input) => handleReport(ctx, input.reportId),
    ROOM,
  );
}
