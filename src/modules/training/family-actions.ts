"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import {
  addFamilyEvent,
  deleteFamilyEvent,
  FamilyEventInput,
  updateFamilyEvent,
} from "./family-events";
import { id } from "./vocabulary";

/**
 * "Tilføj til kalenderen" on the parents' page (docs/adr/0069): a parent
 * adds, changes and removes the family's days in their child's calendar.
 * Every one through `runAction` — the caller's team first, the input
 * validated — and the service and the database decide who may.
 */

const PATHS = ["/parents", "/calendar", "/today", "/me"];

export async function addFamilyEventAction(raw: unknown) {
  return runAction(raw, FamilyEventInput, addFamilyEvent, PATHS);
}

export async function updateFamilyEventAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ eventId: id, event: FamilyEventInput }),
    (ctx, input) => updateFamilyEvent(ctx, input.eventId, input.event),
    PATHS,
  );
}

export async function deleteFamilyEventAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ eventId: id }),
    (ctx, input) => deleteFamilyEvent(ctx, input.eventId),
    PATHS,
  );
}
