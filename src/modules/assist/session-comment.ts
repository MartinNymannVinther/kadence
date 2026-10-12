import { eq } from "drizzle-orm";
import { todayInCopenhagen } from "@/core/dates";
import { activities, plannedSessions, riders, teamSettings } from "@/core/db/schema";
import type { ActivityRow, PlannedSessionRow, RiderRow } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { askForJson, NotAllowed } from "@/modules/ai/service";
import { phaseOf, seasonStartYear } from "@/modules/dcu";
import { deviation, plannedZoneSeconds } from "@/modules/load";
import { isSeniorBasis, profileOf, seasonOfMonth } from "@/modules/paradigms";
import { riderClass } from "@/modules/season/class";
import { requireWriteFor } from "@/modules/team/access";
import { readStructure } from "@/modules/workouts/structure";
import {
  sanitizeComment,
  sessionCommentPrompt,
  type CommentPersona,
  type SessionCommentContext,
} from "./session-comment-prompt";

/**
 * "Få en kommentar fra AI'en" in a session's panel (docs/adr/0095): a
 * short, warm comment on a session that was done, from its numbers. A
 * read: nothing is written here; "Gem som kommentar" is the person's own
 * press, through the ordinary comments (dogma five).
 *
 * Who may ask is who may write on the rider's training — a coach for
 * their rider, a rider for their own session — and only where the AI may
 * read riders' data: the team's switch in a club, the person's own switch
 * in a personal workspace (team_settings.ai_on_rider_data, ADR 0017,
 * 0080), exactly as the week draft asks. Counted against the ceilings and
 * the month's budget like every call (`askForJson`).
 */

export type SessionComment = { comment: string };

type Loaded = { session: PlannedSessionRow; activity: ActivityRow; rider: RiderRow };

const minutesOf = (seconds: readonly number[]) => seconds.map((s) => Math.round(s / 60));

/** The persona and phase for a rider on a day: their class, or an adult's profile. */
export function personaFor(
  rider: Pick<RiderRow, "birthYear" | "categoryOverride" | "trainingProfile">,
  onDate: string,
): { persona: CommentPersona; phase: string } {
  const klass = riderClass(rider, seasonStartYear(onDate));
  const month = Number(onDate.slice(5, 7));
  if (klass.category === "senior" && isSeniorBasis(klass.basis))
    return {
      persona: { kind: "adult", profile: profileOf(klass.basis) },
      phase: seasonOfMonth(month),
    };
  return {
    persona: {
      kind: "youth",
      category: klass.category === "senior" ? "U23" : klass.category,
    },
    phase: phaseOf(month),
  };
}

/** What the model reads, and only that: see session-comment-prompt.ts. */
export function commentContext(loaded: Loaded, today: string): SessionCommentContext {
  const { session, activity, rider } = loaded;
  const sport = session.sport as "bike" | "strength" | "other";
  const structure = readStructure(session.structure, sport);
  const zones = (activity.zoneSeconds ?? null) as { power?: number[]; hr?: number[] } | null;
  const done = {
    minutes: activity.movingSeconds / 60,
    load: activity.load,
    zoneSeconds: zones,
  };
  const explained = deviation(
    { minutes: session.plannedMinutes, load: session.plannedLoad, structure },
    done,
    session.onDate,
    today,
  );
  const plannedZones = plannedZoneSeconds(structure);
  const source = zones?.power?.some((s) => s > 0)
    ? "power"
    : zones?.hr?.some((s) => s > 0)
      ? "hr"
      : null;
  return {
    ...personaFor(rider, session.onDate),
    title: session.title,
    sport,
    planned: {
      minutes: session.plannedMinutes,
      load: session.plannedLoad === null ? null : Math.round(session.plannedLoad),
      zoneMinutes: plannedZones ? minutesOf(plannedZones) : null,
    },
    done: {
      minutes: Math.round(done.minutes),
      load: activity.load === null ? null : Math.round(activity.load),
      zoneMinutes: source ? { source, minutes: minutesOf(zones![source]!) } : null,
      rpe: activity.rpe,
    },
    colour: explained.colour,
    facts: explained.facts,
  };
}

export async function proposeSessionComment(
  ctx: OrgContext,
  input: { sessionId: string },
  locale: string,
): Promise<{ proposal: SessionComment; engine: string } | null> {
  const loaded = await withOrgContext(ctx, async (tx): Promise<Loaded | null> => {
    const [session] = await tx
      .select()
      .from(plannedSessions)
      .where(eq(plannedSessions.id, input.sessionId));
    if (!session) return null;
    await requireWriteFor(tx, ctx, session.riderId);
    const [settings] = await tx
      .select({ allowed: teamSettings.aiOnRiderData })
      .from(teamSettings)
      .where(eq(teamSettings.orgId, ctx.orgId));
    if (!settings?.allowed) throw new NotAllowed();
    if (!session.activityId) return null;
    const [activity] = await tx
      .select()
      .from(activities)
      .where(eq(activities.id, session.activityId));
    const [rider] = await tx.select().from(riders).where(eq(riders.id, session.riderId));
    return activity && rider ? { session, activity, rider } : null;
  });
  if (!loaded) return null;
  const prompt = sessionCommentPrompt(commentContext(loaded, todayInCopenhagen()), locale);
  const { data, engine } = await askForJson(ctx, "session_comment", prompt, { maxTokens: 400 });
  return { proposal: { comment: sanitizeComment(data) }, engine };
}
