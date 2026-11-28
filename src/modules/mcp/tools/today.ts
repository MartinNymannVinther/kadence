import { z } from "zod";
import { addDaysIso } from "@/core/dates";
import { recentRides } from "@/modules/today/recent-rides";
import { listSessions } from "@/modules/training/sessions";
import { getCheckin } from "@/modules/wellbeing/checkins";
import { anyRideShape, sessionShape } from "../shapes";
import { defineTool } from "../tool";

export const getToday = defineTool({
  name: "get_today",
  title: "Today",
  description:
    "The rider's day in Kadence: today's planned sessions (pas), the rides (ture) of today and yesterday — one from Garmin with only the rider's own part, as in list_my_rides — and whether today's check-in is done. Dates are Copenhagen days.",
  input: z.object({}),
  scope: "kadence:read",
  permission: "read_sessions",
  role: "rider",
  readOnly: true,
  run: async ({ ctx, riderId, today, permissions }) => {
    // Rides and the check-in only where the person lets the assistant read them (docs/adr/0120).
    const rides = permissions.includes("read_rides");
    const checkins = permissions.includes("read_checkins");
    const [sessions, ridden, checkin] = await Promise.all([
      listSessions(ctx, { from: today, to: today, riderIds: [riderId] }),
      rides ? recentRides(ctx, riderId, { from: addDaysIso(today, -1), to: today }) : [],
      checkins ? getCheckin(ctx, riderId, today) : null,
    ]);
    return {
      today,
      sessions: sessions.map(sessionShape),
      ...(rides && { rides: ridden.map(anyRideShape) }),
      ...(checkins && { checkinDone: checkin !== null }),
    };
  },
});
