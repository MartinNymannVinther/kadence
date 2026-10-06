import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import {
  clubChampions,
  clubChampionshipEntries,
  clubChampionshipRounds,
  clubChampionships,
  teamSettings,
} from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { requireCoach, requireMember } from "@/modules/team/access";
import {
  DEFAULT_POINTS,
  mostImproved,
  personalBests,
  personKey,
  standings,
  type ClubClass,
  type EntryIn,
  type Improvement,
  type RoundIn,
  type Standing,
} from "./standings";
import { championshipOn } from "./switch";

/**
 * The club championship (docs/adr/0051): everyone in the club reads it,
 * the coaches keep it. The club turns it on under Settings → Team; until
 * then nobody sees it. The database holds the same line (drizzle/0022).
 * Above the club's choice sits the installation's (docs/adr/0056): while
 * it has the championship off, every read here answers as if the club had
 * it off, and every write is refused.
 */

export async function clubChampionshipOn(tx: AppTransaction, orgId: string): Promise<boolean> {
  const [row] = await tx
    .select({ on: teamSettings.clubChampionship })
    .from(teamSettings)
    .where(eq(teamSettings.orgId, orgId))
    .limit(1);
  return championshipOn(row?.on ?? false);
}

async function requireOn(tx: AppTransaction, ctx: OrgContext) {
  if (!(await clubChampionshipOn(tx, ctx.orgId))) throw new Refused("notFound", "clubOff");
}

export type ChampionshipSummary = { id: string; season: number; title: string };

export type ChampionshipView = ChampionshipSummary & {
  rounds: Array<RoundIn & { kind: string; entries: Array<EntryIn & { record: boolean }> }>;
  standings: Record<ClubClass, Standing[]>;
  improvement: Improvement | null;
};

export type Champion = typeof clubChampions.$inferSelect;

export async function listChampionships(ctx: OrgContext): Promise<ChampionshipSummary[] | null> {
  return withOrgContext(ctx, async (tx) => {
    await requireMember(tx, ctx);
    if (!(await clubChampionshipOn(tx, ctx.orgId))) return null;
    return tx
      .select({
        id: clubChampionships.id,
        season: clubChampionships.season,
        title: clubChampionships.title,
      })
      .from(clubChampionships)
      .orderBy(desc(clubChampionships.season), asc(clubChampionships.title));
  });
}

export async function listChampions(ctx: OrgContext): Promise<Champion[]> {
  return withOrgContext(ctx, async (tx) => {
    await requireMember(tx, ctx);
    if (!(await clubChampionshipOn(tx, ctx.orgId))) return [];
    return tx
      .select()
      .from(clubChampions)
      .orderBy(
        desc(clubChampions.year),
        // The classes in their own order, youngest first, then the open class.
        sql`array_position(array['U17','U19','U23','open'], ${clubChampions.class})`,
        asc(clubChampions.title),
      );
  });
}

const asEntry = (e: typeof clubChampionshipEntries.$inferSelect): EntryIn => ({
  id: e.id,
  roundId: e.roundId,
  riderId: e.riderId,
  name: e.name,
  class: e.class as ClubClass,
  timeMs: e.timeMs,
  place: e.place,
  status: e.status as EntryIn["status"],
});

/** One championship with its rounds, results, standings, records and the year's improvement. */
export async function getChampionship(
  ctx: OrgContext,
  id: string,
): Promise<ChampionshipView | null> {
  return withOrgContext(ctx, async (tx) => {
    await requireMember(tx, ctx);
    if (!(await clubChampionshipOn(tx, ctx.orgId))) return null;
    const [c] = await tx.select().from(clubChampionships).where(eq(clubChampionships.id, id));
    if (!c) return null;
    const rounds = await tx
      .select()
      .from(clubChampionshipRounds)
      .where(eq(clubChampionshipRounds.championshipId, id))
      .orderBy(asc(clubChampionshipRounds.heldOn));
    const entries = rounds.length
      ? (
          await tx
            .select()
            .from(clubChampionshipEntries)
            .where(
              inArray(
                clubChampionshipEntries.roundId,
                rounds.map((r) => r.id),
              ),
            )
        ).map(asEntry)
      : [];
    // Records and improvement look across every year the club rode a course.
    const timedRows = await tx
      .select({
        entry: clubChampionshipEntries,
        heldOn: clubChampionshipRounds.heldOn,
        title: clubChampionshipRounds.title,
      })
      .from(clubChampionshipEntries)
      .innerJoin(
        clubChampionshipRounds,
        eq(clubChampionshipRounds.id, clubChampionshipEntries.roundId),
      )
      .where(
        and(
          eq(clubChampionshipRounds.measure, "time"),
          eq(clubChampionshipEntries.status, "finished"),
        ),
      );
    const timed = timedRows
      .filter((r) => r.entry.timeMs !== null)
      .map((r) => ({
        id: r.entry.id,
        key: personKey(r.entry),
        name: r.entry.name,
        course: r.title,
        heldOn: r.heldOn,
        timeMs: r.entry.timeMs!,
      }));
    const records = personalBests(timed);
    const roundsIn: RoundIn[] = rounds.map((r) => ({
      id: r.id,
      heldOn: r.heldOn,
      title: r.title,
      measure: r.measure as RoundIn["measure"],
    }));
    const points = Array.isArray(c.points) ? (c.points as number[]) : [...DEFAULT_POINTS];
    return {
      id: c.id,
      season: c.season,
      title: c.title,
      rounds: rounds.map((r, i) => ({
        ...roundsIn[i]!,
        kind: r.kind,
        entries: entries
          .filter((e) => e.roundId === r.id)
          .map((e) => ({ ...e, record: records.has(e.id) })),
      })),
      standings: standings(roundsIn, entries, points),
      improvement: mostImproved(timed, c.season),
    };
  });
}

export async function createChampionship(
  ctx: OrgContext,
  input: { season: number; title: string },
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await requireOn(tx, ctx);
    const [row] = await tx
      .insert(clubChampionships)
      .values({
        orgId: ctx.orgId,
        season: input.season,
        title: input.title,
        points: [...DEFAULT_POINTS],
        createdBy: ctx.userId,
      })
      .returning({ id: clubChampionships.id });
    return row!;
  });
}

export async function addRound(
  ctx: OrgContext,
  input: { championshipId: string; heldOn: string; kind: string; title: string; measure: string },
): Promise<{ id: string }> {
  return withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await requireOn(tx, ctx);
    const [row] = await tx
      .insert(clubChampionshipRounds)
      .values({ orgId: ctx.orgId, ...input })
      .returning({ id: clubChampionshipRounds.id });
    return row!;
  });
}

export async function removeRound(ctx: OrgContext, roundId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await tx.delete(clubChampionshipRounds).where(eq(clubChampionshipRounds.id, roundId));
  });
}

export type EntryInput = Omit<EntryIn, "id" | "roundId">;

/** A round's results as the coach typed them, all at once: what was there is replaced. */
export async function saveRoundEntries(
  ctx: OrgContext,
  roundId: string,
  entries: EntryInput[],
): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    await requireOn(tx, ctx);
    const [round] = await tx
      .select({ id: clubChampionshipRounds.id })
      .from(clubChampionshipRounds)
      .where(eq(clubChampionshipRounds.id, roundId));
    if (!round) throw new Refused("notFound");
    await tx.delete(clubChampionshipEntries).where(eq(clubChampionshipEntries.roundId, roundId));
    if (entries.length > 0)
      await tx
        .insert(clubChampionshipEntries)
        .values(entries.map((e) => ({ orgId: ctx.orgId, roundId, ...e })));
  });
}
