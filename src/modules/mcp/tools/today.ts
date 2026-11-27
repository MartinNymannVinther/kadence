import { z } from "zod";
import { addDaysIso } from "@/core/dates";
import { recentRides } from "@/modules/today/recent-rides";
import { listSessions } from "@/modules/training/sessions";
import { getCheckin } from "@/modules/wellbeing/checkins";
import { fromGarmin, rideShape, sessionShape } from "../shapes";
import { defineTool } from "../tool";

export const getToday = defineTool({
  name: "get_today",
  title: "Today",
  description:
    "The rider's day in Kadence: today's planned sessions (pas), the rides (ture) of today and yesterday, and whether today's check-in is done. Dates are Copenhagen days.",
  input: z.object({}),
  scope: "kadence:read",
  role: "rider",
  readOnly: true,
  run: async ({ ctx, riderId, today }) => {
    const [sessions, rides, checkin] = await Promise.all([
      listSessions(ctx, { from: today, to: today, riderIds: [riderId] }),
      recentRides(ctx, riderId, { from: addDaysIso(today, -1), to: today }),
      getCheckin(ctx, riderId, today),
    ]);
    return {
      today,
      sessions: sessions.map(sessionShape),
      rides: rides.filter((r) => !fromGarmin(r.source)).map(rideShape),
      ridesFromGarminLeftOut: rides.filter((r) => fromGarmin(r.source)).length,
      checkinDone: checkin !== null,
    };
  },
});
