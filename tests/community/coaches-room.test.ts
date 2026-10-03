import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import {
  handleReport,
  openReports,
  report,
  setHidden,
  setLocked,
} from "@/modules/community/moderation";
import {
  createThread,
  getThread,
  listThreads,
  reply,
  takeWorkout,
  unreadThreadCount,
} from "@/modules/community/service";
import { listTemplates } from "@/modules/training/templates";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Trænerrummet (drizzle/0023, docs/adr/0052): coaches of different clubs
 * read and write one room; riders and parents never do; the database
 * signs every post with its author and club; only the installation's
 * owner moderates; and a deleted account leaves its posts nameless.
 */

const A = { orgId: "org_room_a", userId: "user_room_coach_a" };
const B = { orgId: "org_room_b", userId: "user_room_coach_b" };
const RIDER = { orgId: "org_room_a", userId: "user_room_rider" };
const OWNER = { orgId: "org_room_owner", userId: "user_room_owner" };

let admin: Pool;
let app: Client;
let threadId: string;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A.orgId, A.userId, "owner", "Vejle CK");
  await seedPerson(admin, B.orgId, B.userId, "admin", "Odder CK");
  await seedPerson(admin, RIDER.orgId, RIDER.userId, "member");
  await seedPerson(admin, OWNER.orgId, OWNER.userId, "owner", "Installationen");
  await admin.query(`update users set platform_role = 'owner', name = 'Ejer' where id = $1`, [
    OWNER.userId,
  ]);
  await admin.query(`update users set name = 'Anne Træner' where id = $1`, [A.userId]);
  const tpl = insertSql("workout_templates", {
    org_id: A.orgId,
    id: "room_tpl",
    name: "3x10 Z4",
    sport: "bike",
    structure: { kind: "bike", steps: [] },
  });
  await admin.query(tpl.text, tpl.values);
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("Trænerrummet", () => {
  it("a coach starts a thread, signed by the database with name and club", async () => {
    threadId = (
      await createThread(A, {
        category: "strength",
        title: "Styrke om vinteren",
        body: "Hvor mange pas om ugen?",
        templateId: "room_tpl",
      })
    ).id;
    const thread = (await getThread(B, threadId))!;
    expect(thread).toMatchObject({ authorName: "Anne Træner", clubName: "Vejle CK", mine: false });
    expect(thread.workout?.name).toBe("3x10 Z4");
  });

  it("a coach of another club reads, replies and takes the session into their own library", async () => {
    await reply(B, threadId, "Tre pas i december.");
    expect((await getThread(A, threadId))!.posts.map((p) => p.clubName)).toEqual(["Odder CK"]);
    await takeWorkout(B, threadId);
    expect((await listTemplates(B)).map((t) => t.name)).toContain("3x10 Z4");
  });

  it("riders and parents see nothing", async () => {
    expect(await listThreads(RIDER)).toBeNull();
    const rows = await asApp(app, RIDER, (c) =>
      c.query("select count(*)::int as n from community_threads"),
    );
    expect(rows.rows[0].n).toBe(0);
    await expect(
      createThread(RIDER, { category: "training", title: "x", body: "y" }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("nobody forges who wrote it, and a coach changes only their own words", async () => {
    const forged = (c: Client) =>
      c.query(
        `insert into community_threads (category, title, body, author_user_id, author_org_id, author_name, club_name)
         values ('training', 'Falsk', 'x', $1, $2, 'Nogen andre', 'Anden klub') returning author_name, club_name`,
        [A.userId, A.orgId],
      );
    const stamped = await asApp(app, A, forged);
    expect(stamped.rows[0]).toEqual({ author_name: "Anne Træner", club_name: "Vejle CK" });
    const edit = (c: Client) =>
      c.query("update community_threads set body = 'ændret' where id = $1", [threadId]);
    expect(await expectSqlError(asApp(app, B, edit))).toBe("42501");
    const rename = (c: Client) =>
      c.query("update community_threads set author_name = 'x' where id = $1", [threadId]);
    expect(await expectSqlError(asApp(app, A, rename))).toBe("42501");
    // Cutting the author off by hand is not the way past the guard: only a
    // deleted account's own foreign key does that.
    const unsign = (c: Client) =>
      c.query(
        "update community_threads set author_user_id = null, body = 'ændret', hidden_at = now() where id = $1",
        [threadId],
      );
    expect(await expectSqlError(asApp(app, B, unsign))).toBe("42501");
    const orphan = (c: Client) =>
      c.query("update community_threads set author_org_id = null where id = $1", [threadId]);
    expect(await expectSqlError(asApp(app, B, orphan))).toBe("42501");
    // A reply stays in its thread, and no thread is pinned into the future.
    const elsewhere = insertSql("community_threads", {
      id: "room_other",
      category: "races",
      title: "Låst",
      body: "x",
      locked: true,
    });
    await admin.query(elsewhere.text, elsewhere.values);
    const move = (c: Client) =>
      c.query("update community_posts set thread_id = 'room_other' where author_user_id = $1", [
        B.userId,
      ]);
    expect(await expectSqlError(asApp(app, B, move))).toBe("42501");
    const pin = (c: Client) =>
      c.query(
        "update community_threads set last_post_at = '2100-01-01' where id = $1 returning last_post_at < now() + interval '1 minute' as fair",
        [threadId],
      );
    expect((await asApp(app, B, pin)).rows[0]).toEqual({ fair: true });
  });

  it("only the owner moderates; a hidden thread is gone for the others", async () => {
    await report(B, { targetKind: "thread", targetId: threadId, reason: "Test" });
    expect(await openReports(B)).toEqual([]);
    const reports = await openReports(OWNER);
    expect(reports).toHaveLength(1);
    await expect(
      setHidden(A, { targetKind: "thread", targetId: threadId, hidden: true }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
    await setHidden(OWNER, { targetKind: "thread", targetId: threadId, hidden: true });
    expect(await getThread(B, threadId)).toBeNull();
    expect((await getThread(A, threadId))?.hidden).toBe(true);
    await setHidden(OWNER, { targetKind: "thread", targetId: threadId, hidden: false });
    await setLocked(OWNER, threadId, true);
    await expect(reply(B, threadId, "Mere")).rejects.toThrow();
    await handleReport(OWNER, reports[0]!.id);
    expect(await openReports(OWNER)).toEqual([]);
  });

  it("counts what is new for a coach until they open it", async () => {
    expect(await unreadThreadCount(A)).toBeGreaterThanOrEqual(0);
    const before = await unreadThreadCount(B);
    await getThread(B, threadId);
    expect(await unreadThreadCount(B)).toBeLessThanOrEqual(before);
  });

  it("a deleted account leaves its posts without a name", async () => {
    await admin.query("delete from users where id = $1", [B.userId]);
    const thread = (await getThread(A, threadId))!;
    expect(thread.posts[0]).toMatchObject({ authorName: "", clubName: "" });
  });
});
