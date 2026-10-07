import type { Pool } from "pg";
import type { PushConfig } from "@/modules/push/send";
import { newVapidKeyPair, parseVapidKeys } from "@/modules/push/vapid";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A team for the reminder job's tests (docs/adr/0060), and a stand-in for
 * the push services: the job is handed a `fetch` that records each push
 * and answers with whatever the test says, so the suite never reaches the
 * network. Two coaches, two riders, a parent of the first rider, and the
 * first rider on a second team as well. Every id carries the file's key,
 * so two files can share the database.
 *
 * Tuesday 6 October 2026 is summer time: 17.05 UTC is 19.05 in Copenhagen.
 */

export type Who = { orgId: string; userId: string };

export const at = (iso: string) => new Date(iso);
export const MORNING = at("2026-10-06T06:00:00Z");
export const NOON = at("2026-10-06T10:00:00Z");
export const EVENING = at("2026-10-06T17:05:00Z");

export function pushTeam(admin: Pool, key: string) {
  const ORG = `org_${key}`;
  const ORG_B = `org_${key}_b`;
  const person = (name: string) => ({ orgId: ORG, userId: `user_${key}_${name}` });
  const people = {
    COACH: person("coach"),
    COACH2: person("coach2"),
    RIDER: person("rider"),
    RIDER2: person("rider2"),
    PARENT: person("parent"),
  };
  const riders = { first: `r_${key}`, second: `r_${key}2`, onB: `r_${key}b` };

  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  let answer: (url: string) => number = () => 201;
  const pair = newVapidKeyPair();
  const config: PushConfig = {
    keys: parseVapidKeys(pair.publicKey, pair.privateKey),
    subject: "mailto:test@example.dk",
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return new Response(null, { status: answer(url) });
    }) as typeof fetch,
  };
  const marker = `/push-${key}-`;

  async function insert(table: string, values: Record<string, unknown>) {
    const q = insertSql(table, values);
    await admin.query(q.text, q.values);
  }

  return {
    ORG,
    ORG_B,
    ...people,
    riders,
    config,
    calls,
    insert,
    answer(fn: (url: string) => number) {
      answer = fn;
    },
    /** The pushes this file made, by the name in their address. */
    pushed: () => calls.filter((c) => c.url.includes(marker)).map((c) => c.url.split(marker)[1]),

    async seed() {
      await seedPerson(admin, ORG, people.COACH.userId, "owner", `Push ${key}`);
      await seedPerson(admin, ORG, people.COACH2.userId, "admin");
      for (const p of [people.RIDER, people.RIDER2, people.PARENT])
        await seedPerson(admin, ORG, p.userId, "member");
      await seedPerson(admin, ORG_B, `user_${key}_coach_b`, "owner", `Push ${key} B`);
      // The same rider on a second team (seedPerson keys memberships by user).
      await insert("memberships", {
        id: `mem_${key}_rider_b`,
        organization_id: ORG_B,
        user_id: people.RIDER.userId,
        role: "member",
      });
      const rider = (id: string, org: string, userId: string, name: string) =>
        insert("riders", { id, org_id: org, user_id: userId, name, birth_year: 2010 });
      await rider(riders.first, ORG, people.RIDER.userId, "Emma Holm");
      await rider(riders.second, ORG, people.RIDER2.userId, "Jonas Berg");
      await rider(riders.onB, ORG_B, people.RIDER.userId, "Emma Holm");
      await insert("guardians", {
        id: `g_${key}`,
        org_id: ORG,
        rider_id: riders.first,
        user_id: people.PARENT.userId,
        name: "Mor",
        confirmed_at: MORNING,
      });
    },

    async subscribe(
      name: string,
      who: Who,
      options: { kinds?: string[]; toldUpTo?: Date; address?: string } = {},
    ) {
      const kinds = options.kinds ?? ["checkin", "comment", "plan", "week"];
      await insert("push_subscriptions", {
        id: `${key}_${name}`,
        org_id: who.orgId,
        user_id: who.userId,
        endpoint: `https://fcm.googleapis.com/fcm/send${marker}${options.address ?? name}`,
        kinds: `{${kinds.join(",")}}`,
        told_up_to: options.toldUpTo ?? MORNING,
        created_at: MORNING,
        updated_at: MORNING,
      });
    },

    async row(name: string) {
      const result = await admin.query(
        `select told_up_to, updated_at, checkin_reminded_on::text as checkin, week_told_on::text as week
         from push_subscriptions where id = $1`,
        [`${key}_${name}`],
      );
      return result.rows[0] as
        | { told_up_to: Date; updated_at: Date; checkin: string | null; week: string | null }
        | undefined;
    },

    async session(id: string, riderId: string, onDate: string, by: string, when: Date) {
      await insert("planned_sessions", {
        id,
        org_id: ORG,
        rider_id: riderId,
        on_date: onDate,
        sport: "bike",
        title: `Pas ${id}`,
        created_by: by,
        created_at: when,
        updated_at: when,
      });
    },

    /** A session somebody deleted, as the session service writes it down (drizzle/0035). */
    async deletion(riderId: string, onDate: string, by: string, when: Date) {
      await insert("planned_session_deletions", {
        org_id: ORG,
        rider_id: riderId,
        on_date: onDate,
        title: "Et slettet pas",
        deleted_by: by,
        deleted_at: when,
      });
    },

    async comment(id: string, sessionId: string, riderId: string, by: string, when: Date) {
      await insert("comments", {
        id,
        org_id: ORG,
        rider_id: riderId,
        author_id: by,
        planned_session_id: sessionId,
        body: "Godt kørt",
        created_at: when,
        updated_at: when,
      });
    },

    /** Between tests: every subscription, comment, session, deletion and check-in gone, the stand-in reset. */
    async clear() {
      calls.length = 0;
      answer = () => 201;
      await admin.query("delete from push_subscriptions where org_id in ($1, $2)", [ORG, ORG_B]);
      await admin.query("delete from comments where org_id = $1", [ORG]);
      await admin.query("delete from planned_sessions where org_id = $1", [ORG]);
      await admin.query("delete from planned_session_deletions where org_id = $1", [ORG]);
      await admin.query("delete from checkins where org_id in ($1, $2)", [ORG, ORG_B]);
    },
  };
}
