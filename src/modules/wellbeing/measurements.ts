import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import {
  riderMeasurements,
  riders,
  teamSettings,
  type RiderMeasurementRow,
} from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { requireWriteFor } from "@/modules/team/access";

/**
 * Measurements that change slowly: height through the growth spurt, the
 * thresholds a test gave, resting pulse. Weight is refused for riders
 * under 19 unless the team has turned it on (ADR 0013) — in the service,
 * because it is a team's choice, not a person's permission.
 */

export const MEASUREMENT_KINDS = [
  "height_cm",
  "weight_kg",
  "ftp_w",
  "threshold_hr",
  "max_hr",
  "resting_hr",
] as const;

const LIMITS: Record<(typeof MEASUREMENT_KINDS)[number], [number, number]> = {
  height_cm: [100, 230],
  weight_kg: [25, 150],
  ftp_w: [50, 700],
  threshold_hr: [100, 230],
  max_hr: [120, 240],
  resting_hr: [25, 110],
};

export const MeasurementInput = z
  .object({
    riderId: z.string().min(1).max(100),
    measuredOn: z.iso.date(),
    kind: z.enum(MEASUREMENT_KINDS),
    value: z.coerce.number(),
    note: z.string().trim().max(300).default(""),
  })
  .refine((m) => m.value >= LIMITS[m.kind][0] && m.value <= LIMITS[m.kind][1], {
    path: ["value"],
  });

/** Under 19 in the racing year the measurement falls in: DCU's U17 and U19. */
export function isYouth(birthYear: number, onDate: string): boolean {
  return Number(onDate.slice(0, 4)) - birthYear < 19;
}

export async function addMeasurement(ctx: OrgContext, input: z.infer<typeof MeasurementInput>) {
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, input.riderId);
    if (input.kind === "weight_kg") {
      const [rider] = await tx
        .select({ birthYear: riders.birthYear })
        .from(riders)
        .where(eq(riders.id, input.riderId));
      const [settings] = await tx
        .select({ allow: teamSettings.allowYouthWeight })
        .from(teamSettings)
        .where(eq(teamSettings.orgId, ctx.orgId));
      if (rider && isYouth(rider.birthYear, input.measuredOn) && !settings?.allow)
        throw new Refused("forbidden", "youthWeight");
    }
    const [row] = await tx
      .insert(riderMeasurements)
      .values({ orgId: ctx.orgId, ...input, createdBy: ctx.userId })
      .returning({ id: riderMeasurements.id });
    return row!;
  });
}

export async function listMeasurements(
  ctx: OrgContext,
  riderId: string,
  kind?: (typeof MEASUREMENT_KINDS)[number],
): Promise<RiderMeasurementRow[]> {
  return withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(riderMeasurements)
      .where(
        and(
          eq(riderMeasurements.riderId, riderId),
          kind ? eq(riderMeasurements.kind, kind) : undefined,
        ),
      )
      .orderBy(asc(riderMeasurements.measuredOn)),
  );
}

export async function deleteMeasurement(ctx: OrgContext, id: string) {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(riderMeasurements).where(eq(riderMeasurements.id, id));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx.delete(riderMeasurements).where(eq(riderMeasurements.id, id));
  });
}
