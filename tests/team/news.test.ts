import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { listRiderNews } from "@/modules/team/news";
import { setSharing } from "@/modules/team/riders";
import { addComment } from "@/modules/training/comments";
import { createGroupSessions } from "@/modules/training/group";
import { saveCheckin } from "@/modules/wellbeing/checkins";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Nyt fra rytterne" on a coach's Overblik: the riders' own comments and
 * check-in notes from the last 14 Copenhagen days, newest first and
 * capped. A coach's words are not the riders', and the list is never more
 * than the caller may read: a rider gets their own, a parent the child's
 * comments and the notes only when the child shares check-ins.
 */

const ORG = "org_news";
const COACH = { orgId: ORG, userId: "user_news_coach" };
const EMMA = { orgId: ORG, userId: "user_news_emma" };
const OSKAR = { orgId: ORG, userId: "user_news_oskar" };
const MOR = { orgId: ORG, userId: "user_news_mor" };
const TODAY = "2026-11-10";

const plan = (title: string) => ({
  onDate: "2026-11-09",
  sport: "bike" as const,
  title,
  description: "",
  structure: {
    kind: "bike" as const,
    steps: [
      {
        kind: "step" as const,
        intent: "steady" as const,
        seconds: 3600,
        target: { kind: "zone" as const, zone: 2 },
      },
    ],
  },
  plannedMinutes: 0,
  plannedKm: null,
  templateId: null,
});

const checkin = (riderId: string, onDate: string, note: string) => ({
  riderId,
  onDate,
  sleepHours: 8,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  soreness: 4,
  stress: 4,
  pain: 0,
  painWhere: "",
  ill: 0,
  note,
});

let admin: Pool;
let emmaSession: string;

/** Writes a comment and sets when it was written, so the order is the test's. */
async function said(
  ctx: typeof COACH,
  target: Parameters<typeof addComment>[1],
  body: string,
  at: string,
) {
  const { id } = await addComment(ctx, target, body);
  await admin.query(`update comments set created_at = $2 where id = $1`, [id, at]);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [EMMA, OSKAR, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [id, userId, name] of [
    ["news_emma", EMMA.userId, "Emma Holm"],
    ["news_oskar", OSKAR.userId, "Oskar Lund"],
  ] as const) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: userId, name, birth_year: 2009 });
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "news_emma",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);

  emmaSession = (await createGroupSessions(COACH, ["news_emma"], plan("Grundtur"))).ids[0]!;
  const oskarSession = (await createGroupSessions(COACH, ["news_oskar"], plan("Restitution")))
    .ids[0]!;

  await said(EMMA, { plannedSessionId: emmaSession }, "Benene var tunge.", "2026-11-10T09:30:00Z");
  // The coach answers in the same thread: not the riders' words.
  await said(COACH, { plannedSessionId: emmaSession }, "Flot kørt.", "2026-11-10T09:45:00Z");
  await said(
    OSKAR,
    { plannedSessionId: oskarSession },
    "Kan vi bytte torsdag og fredag?",
    "2026-11-09T17:40:00Z",
  );
  await said(
    EMMA,
    { riderId: "news_emma", onDate: "2026-11-08" },
    "Fri i dag.",
    "2026-11-08T12:00:00Z",
  );
  // The first day of the fourteen begins at midnight in Copenhagen, 23.00 UTC the day before.
  await said(OSKAR, { plannedSessionId: oskarSession }, "Inden for.", "2026-10-27T23:30:00Z");
  await said(OSKAR, { plannedSessionId: oskarSession }, "Uden for.", "2026-10-27T22:30:00Z");

  await saveCheckin(EMMA, checkin("news_emma", TODAY, "Knæet driller lidt."));
  await saveCheckin(OSKAR, checkin("news_oskar", TODAY, ""));
  await saveCheckin(EMMA, checkin("news_emma", "2026-10-25", "Gammel note."));
  await admin.query(
    `update checkins set updated_at = case on_date when $1::date then $2::timestamptz else $3::timestamptz end
      where org_id = $4`,
    [TODAY, "2026-11-10T06:15:00Z", "2026-10-25T07:00:00Z", ORG],
  );
});

afterAll(async () => {
  await admin.end();
});

describe("listRiderNews", () => {
  it("gives a coach the riders' comments and check-in notes, newest first", async () => {
    const news = await listRiderNews(COACH, { today: TODAY });
    expect(news.map((n) => [n.riderName, n.kind, n.text])).toEqual([
      ["Emma Holm", "comment", "Benene var tunge."],
      ["Emma Holm", "checkin", "Knæet driller lidt."],
      ["Oskar Lund", "comment", "Kan vi bytte torsdag og fredag?"],
      ["Emma Holm", "comment", "Fri i dag."],
      ["Oskar Lund", "comment", "Inden for."],
    ]);
    expect(news[0]).toMatchObject({
      on: "session",
      about: "Grundtur",
      href: `/today?session=${emmaSession}`,
      at: new Date("2026-11-10T09:30:00Z"),
    });
    expect(news[1]).toMatchObject({ on: "day", about: TODAY, href: "/riders/news_emma" });
    expect(news[3]).toMatchObject({ on: "day", about: "2026-11-08", href: "/riders/news_emma" });
  });

  it("leaves the coach's own words out", async () => {
    const news = await listRiderNews(COACH, { today: TODAY });
    expect(news.some((n) => n.text === "Flot kørt.")).toBe(false);
  });

  it("is capped, keeping the newest", async () => {
    const news = await listRiderNews(COACH, { today: TODAY, limit: 2 });
    expect(news.map((n) => n.text)).toEqual(["Benene var tunge.", "Knæet driller lidt."]);
  });

  it("holds the last fourteen days and nothing written after the day asked about", async () => {
    const all = await listRiderNews(COACH, { today: TODAY, limit: 20 });
    expect(all.map((n) => n.text)).not.toContain("Uden for.");
    expect(all.map((n) => n.text)).not.toContain("Gammel note.");
    const dayBefore = await listRiderNews(COACH, { today: "2026-11-09", days: 2 });
    expect(dayBefore.map((n) => n.text)).toEqual(["Kan vi bytte torsdag og fredag?", "Fri i dag."]);
  });

  it("gives a rider their own and nobody else's", async () => {
    const emma = await listRiderNews(EMMA, { today: TODAY });
    expect(emma.map((n) => n.text)).toEqual([
      "Benene var tunge.",
      "Knæet driller lidt.",
      "Fri i dag.",
    ]);
    const oskar = await listRiderNews(OSKAR, { today: TODAY });
    expect(oskar.every((n) => n.riderId === "news_oskar")).toBe(true);
    expect(oskar.map((n) => n.text)).toEqual(["Kan vi bytte torsdag og fredag?", "Inden for."]);
  });

  it("gives a parent the child's comments, and the notes only when the child shares check-ins", async () => {
    const before = await listRiderNews(MOR, { today: TODAY });
    expect(before.map((n) => n.kind)).toEqual(["comment", "comment"]);
    await setSharing(EMMA, { shareTraining: true, shareWellbeing: true });
    const after = await listRiderNews(MOR, { today: TODAY });
    expect(after.map((n) => n.text)).toEqual([
      "Benene var tunge.",
      "Knæet driller lidt.",
      "Fri i dag.",
    ]);
  });
});
