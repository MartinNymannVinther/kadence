"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { withOrgContext } from "@/core/db/tenant";
import { requireCoach } from "@/modules/team/access";
import { createSessionIn } from "@/modules/training/sessions";
import { SessionInput } from "@/modules/training/vocabulary";

/**
 * Taking a proposal: the coach's press, not the model's (dogma 5). A
 * session from the week draft is written as the coach would write it,
 * marked `origin = ai` so the calendar can say where it came from.
 */
export async function acceptDraftSessionAction(raw: unknown) {
  return runAction(
    raw,
    SessionInput,
    (ctx, input) =>
      withOrgContext(ctx, async (tx) => {
        await requireCoach(tx, ctx);
        return createSessionIn(tx, ctx, { ...input, origin: "ai" });
      }),
    ["/calendar", "/today"],
  );
}

export async function acceptDraftSessionsAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ sessions: z.array(SessionInput).min(1).max(14) }),
    (ctx, input) =>
      withOrgContext(ctx, async (tx) => {
        await requireCoach(tx, ctx);
        const ids: string[] = [];
        for (const s of input.sessions)
          ids.push((await createSessionIn(tx, ctx, { ...s, origin: "ai" })).id);
        return { ids };
      }),
    ["/calendar", "/today"],
  );
}
