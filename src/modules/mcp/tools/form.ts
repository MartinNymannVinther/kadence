import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { activities } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { getInsights } from "@/modules/insight/service";
import { defineTool, ToolRefusal } from "../tool";

/** Whether any ride of the rider's came in through Garmin, ever. */
async function hasGarminRides(ctx: OrgContext, riderId: string): Promise<boolean> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({ one: sql<number>`1` })
      .from(activities)
      .where(and(eq(activities.riderId, riderId), eq(activities.source, "garmin")))
      .limit(1),
  );
  return rows.length > 0;
}

export const getMyForm = defineTool({
  name: "get_my_form",
  title: "My form",
  description:
    "The rider's fitness (kondition, the 42-day average of daily load), fatigue (træthed, the 7-day average) and form (friskhed, yesterday's fitness minus fatigue; above 0 rested, a little below 0 normal in a training week) per day, and hours and load per week. Kadence's own names; use them. Not available when any of the rider's rides came through Garmin, because those numbers are built on Garmin's data.",
  input: z.object({
    days: z
      .number()
      .int()
      .min(7)
      .max(90)
      .optional()
      .describe("How many days back, 7-90. Default 42."),
  }),
  scope: "kadence:read",
  permission: "read_form",
  role: "rider",
  readOnly: true,
  run: async ({ ctx, riderId, today }, input) => {
    if (await hasGarminRides(ctx, riderId))
      throw new ToolRefusal(
        "The rider's form is built in part on rides from Garmin, and Garmin's data is not given to an assistant. The rider can see the form in Kadence.",
      );
    const [insight] = await getInsights(ctx, { riderIds: [riderId], today });
    if (!insight) throw new ToolRefusal("No form to show yet.");
    const days = input.days ?? 42;
    return {
      today,
      days: insight.series.slice(-days).map((d) => ({
        date: d.date,
        load: Math.round(d.load),
        fitness: Math.round(d.fitness),
        fatigue: Math.round(d.fatigue),
        form: Math.round(d.form),
      })),
      weeks: insight.weeks.map((w) => ({
        monday: w.monday,
        hours: w.hours,
        bikeHours: w.bikeHours,
        load: w.load,
        sessions: w.sessions,
      })),
    };
  },
});
