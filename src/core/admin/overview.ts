import { sql } from "drizzle-orm";
import { isPlatformOwner } from "@/core/access/service";
import { appDb } from "@/core/db/client";

/**
 * The installation's overview for its owner (docs/adr/0048): one row per
 * club with counts only. The database function platform_overview()
 * (drizzle/0019) reads across every workspace and refuses anyone who is
 * not the owner; this asks it as the owner, with nothing set but who is
 * asking. There is no org context, so no domain table is readable here.
 */
export type ClubOverview = {
  orgId: string;
  name: string;
  createdAt: Date;
  coaches: number;
  riders: number;
  parents: number;
  members: number;
  lastSeen: Date | null;
  fileBytes: number;
  aiCallsDay: number;
};

type Row = {
  org_id: string;
  name: string;
  created_at: Date | string;
  coaches: string | number;
  riders: string | number;
  parents: string | number;
  members: string | number;
  last_seen: Date | string | null;
  file_bytes: string | number;
  ai_calls_day: string | number;
};

const date = (v: Date | string) => (v instanceof Date ? v : new Date(v));

/** Null for anyone but the installation's owner. */
export async function platformOverview(userId: string): Promise<ClubOverview[] | null> {
  if (!(await isPlatformOwner(userId))) return null;
  const rows = await appDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    const result = await tx.execute(sql`select * from platform_overview()`);
    return result.rows as Row[];
  });
  return rows.map((r) => ({
    orgId: r.org_id,
    name: r.name,
    createdAt: date(r.created_at),
    coaches: Number(r.coaches),
    riders: Number(r.riders),
    parents: Number(r.parents),
    members: Number(r.members),
    lastSeen: r.last_seen ? date(r.last_seen) : null,
    fileBytes: Number(r.file_bytes),
    aiCallsDay: Number(r.ai_calls_day),
  }));
}
