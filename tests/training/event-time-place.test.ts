import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { toEventCard } from "@/components/calendar/to-card";
import { createEvent, EventInput, listEvents, updateEvent } from "@/modules/training/events";
import { adminPool, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * When and where a race starts, and who drives (docs/backlog.md P2-03):
 * written through the event service, read back as the calendar's card,
 * left as they were by a change that does not mention them, cleared by
 * null and "", and held to their lengths by the form and the database.
 */

const ORG = "org_event_where";
const COACH = { orgId: ORG, userId: "user_event_where_coach" };
const DAY = "2026-11-07";

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
});

afterAll(async () => {
  await admin.end();
});

const race = EventInput.parse({
  riderId: null,
  kind: "race",
  title: "Fyn Rundt",
  startsOn: DAY,
  endsOn: DAY,
  startTime: "09:30",
  meetingPlace: " Odense Havn ",
  transportNote: "Bus fra klubhuset kl. 7.45",
});

async function card(id: string) {
  const rows = await listEvents(COACH, { from: DAY, to: DAY });
  return toEventCard(rows.find((r) => r.id === id)!);
}

describe("an event's time, place and driving", () => {
  it("comes back as it was written, the place trimmed", async () => {
    const { id } = await createEvent(COACH, race);
    expect(await card(id)).toMatchObject({
      startTime: "09:30",
      meetingPlace: "Odense Havn",
      transportNote: "Bus fra klubhuset kl. 7.45",
    });
  });

  it("stays when a change does not mention it, and goes with null and empty text", async () => {
    const { id } = await createEvent(COACH, race);
    const { startTime, meetingPlace, transportNote, ...rest } = race;
    await updateEvent(COACH, id, { ...rest, title: "Fyn Rundt, junior" });
    expect(await card(id)).toMatchObject({
      title: "Fyn Rundt, junior",
      startTime: "09:30",
      meetingPlace: "Odense Havn",
      transportNote: "Bus fra klubhuset kl. 7.45",
    });
    await updateEvent(COACH, id, { ...race, startTime: null, meetingPlace: "", transportNote: "" });
    expect(await card(id)).toMatchObject({ startTime: null, meetingPlace: "", transportNote: "" });
  });

  it("is an event without them when it is made without them", async () => {
    const { startTime, meetingPlace, transportNote, ...bare } = race;
    const { id } = await createEvent(COACH, bare);
    expect(await card(id)).toMatchObject({ startTime: null, meetingPlace: "", transportNote: "" });
  });

  it("refuses a time that is not one, a place over 120 and a note over 200 characters", () => {
    for (const wrong of [
      { startTime: "25:00" },
      { meetingPlace: "x".repeat(121) },
      { transportNote: "x".repeat(201) },
    ]) {
      expect(EventInput.safeParse({ ...race, ...wrong }).success, JSON.stringify(wrong)).toBe(
        false,
      );
    }
  });

  it("is held to its lengths by the database too", async () => {
    for (const [column, length] of [
      ["meeting_place", 121],
      ["transport_note", 201],
    ] as const) {
      const q = insertSql("calendar_events", {
        org_id: ORG,
        kind: "race",
        title: "x",
        starts_on: DAY,
        ends_on: DAY,
        [column]: "x".repeat(length),
      });
      expect(await expectSqlError(admin.query(q.text, q.values)), column).toBe("23514");
    }
  });
});
