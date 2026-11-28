import { z } from "zod";
import { setFeedback } from "@/modules/training/complete";
import { defineTool } from "../tool";
import { logged, ownPicture, UNDO_WORDS } from "./own";

export const rateMyRide = defineTool({
  name: "rate_my_ride",
  title: "Say how a ride felt",
  description:
    "Sets how hard one of the rider's own rides felt (rpe 1-10), how it felt (feel 1-5) and the rider's note. Fields left out keep what is there. Ask the rider; never guess.",
  input: z.object({
    rideId: z.string().min(1).max(100),
    rpe: z.number().int().min(1).max(10).nullable().optional(),
    feel: z.number().int().min(1).max(5).nullable().optional(),
    note: z.string().max(2000).optional(),
  }),
  scope: "kadence:read",
  permission: "write_ride_feedback",
  role: "rider",
  readOnly: false,
  destructive: true,
  run: async (caller, input) => {
    const before = await ownPicture(caller, "activity", input.rideId);
    await setFeedback(caller.ctx, input.rideId, {
      rpe: input.rpe !== undefined ? input.rpe : ((before.rpe as number | null) ?? null),
      feel: input.feel !== undefined ? input.feel : ((before.feel as number | null) ?? null),
      note: (input.note ?? String(before.note ?? "")).trim(),
    });
    await logged(caller, "rate_my_ride", "activity", input.rideId, "updated", before);
    return { rated: input.rideId, note: UNDO_WORDS };
  },
});
