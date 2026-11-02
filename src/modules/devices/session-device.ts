import { eq } from "drizzle-orm";
import { addDaysIso } from "@/core/dates";
import { deviceWorkouts } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import type { BikeStructure } from "@/modules/workouts/structure";
import { WINDOW_DAYS } from "./calendar-plan";
import type { DeviceLinkView } from "./links";
import { providerById, type ProviderId } from "./providers";

/**
 * Whether a planned bike session is on the rider's calendar at the
 * provider, and when it got there — or why it is not (docs/adr/0114).
 * Shown on the session to the rider and their coaches, who may read the
 * rows under the ordinary policies; the caller decides who sees it.
 */

export type SessionOnDevice =
  | { provider: ProviderId; state: "on"; sentAt: Date | null }
  /** It will be sent by itself on the job's next run. */
  | { provider: ProviderId; state: "pending" }
  | {
      provider: ProviderId;
      state: "not";
      reason: "too_many_steps" | "no_permission" | "rejected" | "refused" | "error";
      max?: number;
    };

export async function sessionOnDevices(
  ctx: OrgContext,
  input: {
    sessionId: string;
    onDate: string;
    today: string;
    structure: BikeStructure;
    links: readonly DeviceLinkView[];
  },
): Promise<SessionOnDevice[]> {
  const linked = input.links.filter(
    (link) => link.status === "connected" && providerById(link.provider).calendar,
  );
  if (linked.length === 0) return [];
  const rows = await withOrgContext(ctx, (tx) =>
    tx.select().from(deviceWorkouts).where(eq(deviceWorkouts.plannedSessionId, input.sessionId)),
  );
  const inWindow =
    input.onDate >= input.today && input.onDate <= addDaysIso(input.today, WINDOW_DAYS - 1);
  return linked.flatMap((link): SessionOnDevice[] => {
    const provider = link.provider;
    const calendar = providerById(provider).calendar!;
    const row = rows.find((r) => r.provider === provider);
    const not = (reason: Extract<SessionOnDevice, { state: "not" }>["reason"]) => [
      { provider, state: "not" as const, reason, max: calendar.maxSteps },
    ];
    if (row?.lastError === "too_many_steps") return not("too_many_steps");
    if (row?.lastError === "rejected") return not("rejected");
    if (row?.externalWorkoutId) return [{ provider, state: "on", sentAt: row.sentAt }];
    if (link.workoutImport === false) return not("no_permission");
    if (link.lastError === "workouts_refused") return not("refused");
    if (calendar.stepCount(input.structure) > calendar.maxSteps) return not("too_many_steps");
    if (link.autoSend && link.workoutImport && inWindow) return [{ provider, state: "pending" }];
    if (row?.lastError) return not("error");
    return [];
  });
}
