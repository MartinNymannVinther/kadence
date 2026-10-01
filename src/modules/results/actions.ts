"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { env } from "@/core/env";
import { id } from "@/modules/training/vocabulary";
import { refreshRaces, type RefreshOutcome } from "./refresh";
import { setUciId, UciIdInput } from "./service";
import { readsRacesFor } from "./switch";

/**
 * The coach's two presses on a rider's page (ADR 0039): the UCI ID, and
 * "read the races now". A new UCI ID is read at once when the
 * installation reads races, so the coach sees the calendar fill.
 */

const PATHS = ["/riders", "/calendar"];

export async function saveUciIdAction(raw: unknown) {
  return runAction(
    raw,
    UciIdInput,
    async (ctx, input) => {
      const saved = await setUciId(ctx, input);
      const read: RefreshOutcome | null = readsRacesFor(env.DCU_RESULTS, saved.uciId)
        ? await refreshRaces(ctx, input.riderId, { force: true })
        : null;
      return { ...saved, read };
    },
    PATHS,
  );
}

export async function refreshRacesAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ riderId: id }),
    (ctx, input) => refreshRaces(ctx, input.riderId, { force: true }),
    PATHS,
  );
}
