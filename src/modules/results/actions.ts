"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { env } from "@/core/env";
import { id } from "@/modules/training/vocabulary";
import { refreshOwnRaces } from "./own";
import { refreshRaces, type RefreshOutcome } from "./refresh";
import { setUciId, UciIdInput } from "./service";
import { readsRacesFor } from "./switch";

/**
 * The presses for a rider's races (ADR 0039): the UCI ID, which the coach
 * or the rider sets, and the coach's "read the races now". A new UCI ID is
 * read at once when the installation reads races, so the calendar fills.
 */

const PATHS = ["/riders", "/calendar", "/settings/me"];

export async function saveUciIdAction(raw: unknown) {
  return runAction(
    raw,
    UciIdInput,
    async (ctx, input) => {
      const saved = await setUciId(ctx, input);
      const profile = saved.profile ?? undefined;
      let read: RefreshOutcome | null = null;
      if (readsRacesFor(env.DCU_RESULTS, saved.uciId)) {
        read = saved.byCoach
          ? await refreshRaces(ctx, input.riderId, { force: true, profile })
          : await refreshOwnRaces(ctx, { profile });
      }
      // The page stays on the server: the browser hears how it went.
      return { uciId: saved.uciId, read };
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
