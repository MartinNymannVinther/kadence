import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { moveSession, skipSession } from "@/modules/training/session-move";
import { listSessions } from "@/modules/training/sessions";
import { pick, type L } from "./seed-data";

/**
 * Moved and skipped sessions in the demo (docs/adr/0117, ADR 0054): a
 * second rider's session skipped for illness — the last one of the past
 * days that was not ridden, where it would have stood "Ikke nået", or else
 * the next one ahead — so it stands grey with its reason; and
 * one of Emma's next sessions moved a day for school, with the coach's
 * words beside it. Written through the ordinary services, as the coach.
 */
export async function seedChanges(
  ctx: OrgContext,
  l: L,
  { today, riderIds }: { today: string; riderIds: string[] },
): Promise<void> {
  const [emma, other] = riderIds;
  if (!emma || !other) return;
  const open = (
    await listSessions(ctx, {
      from: addDaysIso(today, -6),
      to: addDaysIso(today, 6),
      riderIds: [other],
    })
  ).filter((s) => s.activityId === null && s.onDate !== today);
  const missed = open.filter((s) => s.onDate < today).at(-1) ?? open.find((s) => s.onDate > today);
  if (missed)
    await skipSession(ctx, missed.id, {
      reason: "ill",
      note: pick({ da: "Forkølet, bliver hjemme.", en: "Has a cold, stays home." }, l),
    });
  const ahead = (
    await listSessions(ctx, {
      from: addDaysIso(today, 1),
      to: addDaysIso(today, 6),
      riderIds: [emma],
    })
  ).find((s) => s.sport === "bike");
  if (ahead)
    await moveSession(ctx, ahead.id, addDaysIso(ahead.onDate, 1), false, undefined, {
      reason: "school",
      note: pick({ da: "Eksamen om formiddagen.", en: "An exam in the morning." }, l),
    });
}
