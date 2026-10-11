import { sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { appDb } from "@/core/db/client";

/**
 * The installation's overview for its owner (docs/adr/0048): one row per
 * club with counts only. The database function platform_overview()
 * (drizzle/0019) reads across every workspace and refuses anyone who is
 * not the owner; this asks it as the owner, with nothing set but who is
 * asking. There is no org context, so no domain table is readable here.
 * The pilot's three numbers (drizzle/0031, docs/adr/0066) come as counts
 * for the last full week, the same for every club. A personal workspace
 * (drizzle/0041, docs/adr/0080) comes without its name, which is a
 * person's; the page shows persons as one line (`personsSummary`).
 */
export type PilotCounts = {
  /** The Monday of the last full week, a Copenhagen day. */
  week: string;
  riders: number;
  checkedIn: number;
  sessions: number;
  receipts: number;
  minutes: number;
};

export type ClubOverview = {
  orgId: string;
  /** Empty for a personal workspace: the database never hands its name over. */
  name: string;
  kind: "club" | "personal";
  createdAt: Date;
  coaches: number;
  riders: number;
  parents: number;
  members: number;
  lastSeen: Date | null;
  fileBytes: number;
  aiCallsDay: number;
  pilot: PilotCounts;
};

type Count = string | number;

type Row = {
  org_id: string;
  name: string | null;
  kind: string;
  created_at: Date | string;
  coaches: Count;
  riders: Count;
  parents: Count;
  members: Count;
  last_seen: Date | string | null;
  file_bytes: Count;
  ai_calls_day: Count;
  pilot_monday: string;
  pilot_riders: Count;
  pilot_checked_in: Count;
  pilot_sessions: Count;
  pilot_receipts: Count;
  pilot_minutes: Count;
};

const date = (v: Date | string) => (v instanceof Date ? v : new Date(v));

/** Null for anyone but the installation's owner. */
export async function platformOverview(userId: string): Promise<ClubOverview[] | null> {
  if (!(await isPlatformOwner(userId))) return null;
  const rows = await appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    // The week as text, so no driver's idea of a date moves it.
    const result = await tx.execute(
      sql`select *, to_char(pilot_week, 'YYYY-MM-DD') as pilot_monday from platform_overview()`,
    );
    return result.rows as Row[];
  });
  return rows.map((r) => ({
    orgId: r.org_id,
    name: r.kind === "personal" ? "" : (r.name ?? ""),
    kind: r.kind === "personal" ? "personal" : "club",
    createdAt: date(r.created_at),
    coaches: Number(r.coaches),
    riders: Number(r.riders),
    parents: Number(r.parents),
    members: Number(r.members),
    lastSeen: r.last_seen ? date(r.last_seen) : null,
    fileBytes: Number(r.file_bytes),
    aiCallsDay: Number(r.ai_calls_day),
    pilot: {
      week: r.pilot_monday,
      riders: Number(r.pilot_riders),
      checkedIn: Number(r.pilot_checked_in),
      sessions: Number(r.pilot_sessions),
      receipts: Number(r.pilot_receipts),
      minutes: Number(r.pilot_minutes),
    },
  }));
}

/** The persons on the installation as one line: how many, not who (docs/adr/0080). */
export type PersonsSummary = {
  count: number;
  /** Personal workspaces someone was in during the last seven days. */
  seenWeek: number;
  fileBytes: number;
  aiCallsDay: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Adds up the personal workspaces in the overview. Pure. */
export function personsSummary(rows: ClubOverview[], now = new Date()): PersonsSummary {
  const persons = rows.filter((r) => r.kind === "personal");
  return {
    count: persons.length,
    seenWeek: persons.filter((r) => r.lastSeen && now.getTime() - r.lastSeen.getTime() < WEEK_MS)
      .length,
    fileBytes: persons.reduce((n, r) => n + r.fileBytes, 0),
    aiCallsDay: persons.reduce((n, r) => n + r.aiCallsDay, 0),
  };
}
