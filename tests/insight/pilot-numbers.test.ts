import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/core/dates";
import {
  CHECKIN_DAYS,
  copenhagenDay,
  lastFullWeek,
  pilotWeek,
  pilotWeeks,
  planningMinutes,
  share,
  stretchesMs,
  type PilotEdit,
  type PilotInput,
} from "@/modules/insight/pilot-numbers";

/**
 * Pilotens tre tal (docs/adr/0066) on their own, without a database: which
 * riders a week counts, the check-in share, the sessions with a receipt up
 * to yesterday, and the planning minutes from the audit log's moments.
 */

// Monday 28 September to Sunday 4 October 2026, summer time (UTC+2).
const MONDAY = "2026-09-28";
const SUNDAY = "2026-10-04";
const AFTER = "2026-10-06"; // the Tuesday after: the week is over
const WEDNESDAY = "2026-09-30";

const COACH = "user_coach";
const RIDER_USER = "user_rider";

const before = new Date("2026-09-01T10:00:00Z");
const rider = (id: string, createdAt = before, archived = false) => ({ id, createdAt, archived });
const days = (riderId: string, from: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ riderId, onDate: addDaysIso(from, i) }));
const edit = (iso: string, actorUserId: string | null = COACH, entityType = "planned_sessions") =>
  ({ actorUserId, entityType, createdAt: new Date(iso) }) satisfies PilotEdit;

const empty: PilotInput = { riders: [], checkins: [], sessions: [], edits: [], coachIds: [COACH] };
const input = (over: Partial<PilotInput>): PilotInput => ({ ...empty, ...over });

describe("a week's riders and their check-ins", () => {
  it("is nothing at all for a team with no riders, and no share to speak of", () => {
    const week = pilotWeek(MONDAY, AFTER, empty);
    expect(week).toEqual({
      monday: MONDAY,
      inProgress: false,
      riders: 0,
      checkedIn: 0,
      sessions: 0,
      receipts: 0,
      minutes: 0,
    });
    expect(share(week.checkedIn, week.riders)).toBeNull();
    expect(share(3, 4)).toBe(0.75);
  });

  it("counts a rider with a check-in on four days, and not one with three", () => {
    const week = pilotWeek(
      MONDAY,
      AFTER,
      input({
        riders: [rider("a"), rider("b"), rider("c")],
        checkins: [...days("a", MONDAY, CHECKIN_DAYS), ...days("b", MONDAY, 3)],
      }),
    );
    expect(week).toMatchObject({ riders: 3, checkedIn: 1 });
  });

  it("counts only the week's own days", () => {
    const week = pilotWeek(
      MONDAY,
      AFTER,
      input({
        riders: [rider("a")],
        checkins: [
          { riderId: "a", onDate: "2026-09-27" },
          { riderId: "a", onDate: "2026-10-05" },
          ...days("a", "2026-10-01", 3),
        ],
      }),
    );
    expect(week.checkedIn).toBe(0);
  });

  it("leaves an archived rider out of every week, check-ins and sessions alike", () => {
    const week = pilotWeek(
      MONDAY,
      AFTER,
      input({
        riders: [rider("a"), rider("gone", before, true)],
        checkins: [...days("a", MONDAY, 5), ...days("gone", MONDAY, 7)],
        sessions: [
          { riderId: "gone", onDate: MONDAY, activityId: "x" },
          { riderId: "a", onDate: MONDAY, activityId: null },
        ],
      }),
    );
    expect(week).toMatchObject({ riders: 1, checkedIn: 1, sessions: 1, receipts: 0 });
  });

  it("counts a rider who joins in the middle of a week from the next one", () => {
    const data = input({
      riders: [rider("new", new Date("2026-09-30T08:00:00Z"))],
      checkins: [...days("new", WEDNESDAY, 5), ...days("new", "2026-10-05", 1)],
      sessions: [{ riderId: "new", onDate: "2026-10-01", activityId: "x" }],
    });
    expect(pilotWeek(MONDAY, AFTER, data)).toMatchObject({ riders: 0, checkedIn: 0, sessions: 0 });
    expect(pilotWeek("2026-10-05", AFTER, data)).toMatchObject({ riders: 1, checkedIn: 0 });
  });

  it("counts a rider added on the Monday itself, by the Copenhagen day", () => {
    // 21:30 UTC on Monday is 23:30 on Monday in Copenhagen: still Monday.
    const monday = input({ riders: [rider("late", new Date("2026-09-28T21:30:00Z"))] });
    expect(pilotWeek(MONDAY, AFTER, monday).riders).toBe(1);
    // 22:30 UTC on Monday is 00:30 on Tuesday in Copenhagen: the next week.
    const tuesday = input({ riders: [rider("later", new Date("2026-09-28T22:30:00Z"))] });
    expect(pilotWeek(MONDAY, AFTER, tuesday).riders).toBe(0);
    expect(copenhagenDay(new Date("2026-09-27T21:59:00Z"))).toBe("2026-09-27");
    expect(copenhagenDay(new Date("2026-09-27T22:00:00Z"))).toBe("2026-09-28");
    // Winter time: Copenhagen is UTC+1.
    expect(copenhagenDay(new Date("2026-11-29T22:59:00Z"))).toBe("2026-11-29");
    expect(copenhagenDay(new Date("2026-11-29T23:00:00Z"))).toBe("2026-11-30");
  });
});

describe("sessions with a receipt", () => {
  const sessions = [
    { riderId: "a", onDate: MONDAY, activityId: "act1" },
    { riderId: "a", onDate: "2026-09-29", activityId: null },
    { riderId: "a", onDate: WEDNESDAY, activityId: "act2" },
    { riderId: "a", onDate: SUNDAY, activityId: null },
    { riderId: "a", onDate: "2026-10-05", activityId: "act3" },
  ];

  it("counts the week's sessions and the ones with a linked activity", () => {
    const week = pilotWeek(MONDAY, AFTER, input({ riders: [rider("a")], sessions }));
    expect(week).toMatchObject({ sessions: 4, receipts: 2, inProgress: false });
  });

  it("counts a week in progress up to yesterday, and check-ins up to today", () => {
    const week = pilotWeek(
      MONDAY,
      "2026-10-01", // Thursday
      input({
        riders: [rider("a")],
        sessions,
        // Monday to Thursday is four days, today's included.
        checkins: days("a", MONDAY, 4),
      }),
    );
    expect(week).toMatchObject({ inProgress: true, sessions: 3, receipts: 2, checkedIn: 1 });
  });

  it("has nothing due on the week's first day", () => {
    const week = pilotWeek(MONDAY, MONDAY, input({ riders: [rider("a")], sessions }));
    expect(week).toMatchObject({ inProgress: true, sessions: 0, receipts: 0 });
  });
});

describe("the coaches' planning minutes", () => {
  const min = (n: number) => n * 60_000;

  it("counts a single save as two minutes, and nothing as nothing", () => {
    expect(stretchesMs([])).toBe(0);
    expect(stretchesMs([0])).toBe(min(2));
    expect(stretchesMs([0, 0, 0])).toBe(min(2));
  });

  it("keeps saves less than ten minutes apart in one stretch", () => {
    expect(stretchesMs([0, min(5), min(9) + 59_000])).toBe(min(9) + 59_000);
    expect(stretchesMs([0, min(8), min(16), min(24)])).toBe(min(24));
    expect(stretchesMs([min(24), 0, min(16), min(8)])).toBe(min(24));
  });

  it("starts a new stretch after a pause of ten minutes or more", () => {
    expect(stretchesMs([0, min(10)])).toBe(min(4));
    expect(stretchesMs([0, min(3), min(30), min(39)])).toBe(min(3) + min(9));
    expect(stretchesMs([0, min(3), min(30), min(45)])).toBe(min(3) + min(2) + min(2));
  });

  it("counts the coaches' changes to plans, blocks and season plans only", () => {
    const edits = [
      edit("2026-09-29T16:00:00Z"),
      edit("2026-09-29T16:06:00Z", COACH, "training_blocks"),
      edit("2026-09-29T16:12:00Z", COACH, "training_block_items"),
      edit("2026-09-29T16:20:00Z", COACH, "season_plans"),
      // Not planning: a rider's own change, a check-in, the library, the system.
      edit("2026-09-29T16:25:00Z", RIDER_USER),
      edit("2026-09-29T16:29:00Z", COACH, "checkins"),
      edit("2026-09-29T16:29:30Z", COACH, "workout_templates"),
      edit("2026-09-29T16:29:40Z", null),
    ];
    expect(planningMinutes(edits, [COACH], MONDAY, SUNDAY)).toBe(20);
  });

  it("adds each coach's own stretches together", () => {
    const edits = [
      edit("2026-09-29T16:00:00Z"),
      edit("2026-09-29T16:30:00Z"),
      edit("2026-09-29T16:01:00Z", "user_coach2"),
      edit("2026-09-29T16:05:00Z", "user_coach2"),
    ];
    expect(planningMinutes(edits, [COACH, "user_coach2"], MONDAY, SUNDAY)).toBe(2 + 2 + 4);
  });

  it("rounds once, at the end", () => {
    const edits = [
      edit("2026-09-29T16:00:00Z"),
      edit("2026-09-29T16:02:20Z"),
      edit("2026-09-30T16:00:00Z"),
      edit("2026-09-30T16:02:20Z"),
    ];
    // 2 min 20 s twice is 4 min 40 s, which is 5 minutes, not 2 + 2.
    expect(planningMinutes(edits, [COACH], MONDAY, SUNDAY)).toBe(5);
  });

  it("splits a stretch over midnight between Sunday and Monday by the Copenhagen day", () => {
    const edits = [edit("2026-10-04T21:55:00Z"), edit("2026-10-04T22:03:00Z")];
    const data = input({ edits });
    expect(pilotWeek(MONDAY, AFTER, data).minutes).toBe(2);
    expect(pilotWeek("2026-10-05", AFTER, data).minutes).toBe(2);
  });
});

describe("the weeks a coach sees", () => {
  it("is this week first, in progress, and the ones before it", () => {
    const weeks = pilotWeeks(AFTER, 8, empty);
    expect(weeks.map((w) => w.monday)).toEqual([
      "2026-10-05",
      "2026-09-28",
      "2026-09-21",
      "2026-09-14",
      "2026-09-07",
      "2026-08-31",
      "2026-08-24",
      "2026-08-17",
    ]);
    expect(weeks.map((w) => w.inProgress)).toEqual([true, ...Array(7).fill(false)]);
  });

  it("knows the last full week from any day of the next", () => {
    expect(lastFullWeek("2026-10-05")).toBe(MONDAY);
    expect(lastFullWeek("2026-10-11")).toBe(MONDAY);
    expect(lastFullWeek("2026-10-12")).toBe("2026-10-05");
  });
});
