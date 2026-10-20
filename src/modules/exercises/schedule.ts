import { Refused } from "@/core/action";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { createGroupSessionsIn } from "@/modules/training/group";
import type { Repeat } from "@/modules/training/recurrence";
import { MAX_TITLE } from "@/modules/training/vocabulary";
import { builtinProgram } from "./builtin";
import { MAX_SESSION_EXERCISES, programStructure } from "./program-session";
import type { ProgramRef } from "./ref";
import { parseRef } from "./refs";
import { resolveProgram, type Translate } from "./resolve";
import { getTeamProgram } from "./team-programs";
import type { ProgramView } from "./types";

/**
 * "Læg i kalenderen" (docs/plan-ovelser-og-programmer.md): a programme —
 * Kadence's own or the team's — into the calendars of one rider, several
 * or the whole group, on a day or on chosen weekdays until a last one,
 * with a time and a place (ADR 0058). It becomes a strength session whose
 * exercises carry their reference (./program-session.ts), made by the
 * calendar's own scheduler (`createGroupSessionsIn`) — the same group
 * keys, series, limits and checks as every other session.
 *
 * A coach's for one rider as for many; a rider's for themselves alone
 * (docs/adr/0078), as a rider plans their own sessions (ADR 0050). The
 * programme laid is still the team's or Kadence's: what a rider cannot
 * do is hand it to anyone else.
 */

export type ScheduleProgramInput = {
  program: ProgramRef;
  riderIds: string[];
  onDate: string;
  repeat?: Repeat;
  startTime?: string | null;
  meetingPlace?: string;
};

/**
 * The programme a reference names, resolved in the coach's language;
 * null when this team has none by it — another team's, an archived one of
 * its own, or one Kadence does not have.
 */
async function programToLay(
  ctx: OrgContext,
  ref: ProgramRef,
  t: Translate,
): Promise<ProgramView | null> {
  const parsed = parseRef(ref);
  if (parsed.kind === "builtin") {
    const program = builtinProgram(parsed.id);
    if (!program) return null;
    return resolveProgram(ctx, program.parts, t, {
      title: t(`programs.${program.id}.name`),
      description: t(`programs.${program.id}.description`),
    });
  }
  const program = await getTeamProgram(ctx, parsed.id);
  if (!program || program.archived) return null;
  return resolveProgram(ctx, program.parts, t, {
    title: program.name,
    description: program.description,
  });
}

/**
 * Who may lay a programme into whose calendar: a coach into any rider's
 * on the team, a rider into their own and nobody else's, a parent into
 * none. The scheduler under it checks each rider again (`createSessionsIn`).
 */
async function requireLayFor(tx: AppTransaction, ctx: OrgContext, riderIds: string[]) {
  const me = await whoAmIIn(tx, ctx);
  if (!me) throw new Refused("forbidden");
  if (me.isCoach) return;
  const own = me.rider?.id;
  if (!own || riderIds.length !== 1 || riderIds[0] !== own) throw new Refused("forbidden");
}

export async function scheduleProgram(
  ctx: OrgContext,
  input: ScheduleProgramInput,
  t: Translate,
): Promise<{ ids: string[] }> {
  const program = await programToLay(ctx, input.program, t);
  if (!program) throw new Refused("notFound");
  const structure = programStructure(program, t);
  const count = structure.exercises.length;
  if (count === 0 || count > MAX_SESSION_EXERCISES) throw new Refused("invalid");
  return withOrgContext(ctx, async (tx) => {
    await requireLayFor(tx, ctx, input.riderIds);
    const { ids } = await createGroupSessionsIn(
      tx,
      ctx,
      input.riderIds,
      {
        onDate: input.onDate,
        sport: "strength",
        title: program.title.slice(0, MAX_TITLE),
        description: program.description,
        structure,
        plannedMinutes: structure.minutes,
        plannedKm: null,
        templateId: null,
        startTime: input.startTime,
        meetingPlace: input.meetingPlace,
      },
      input.repeat,
    );
    return { ids };
  });
}
