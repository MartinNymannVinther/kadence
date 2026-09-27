import { describe, expect, it } from "vitest";
import { coachTips, MAX_TIPS, type TipInput } from "@/modules/coach";

/** The coach's tips: picked from the calendar, the team and the season; never more than a few. */

const base: TipInput = {
  today: "2026-09-15",
  riders: [{ category: "U19", yearInClass: 2, sex: "male" }],
  events: [],
  flagKinds: [],
  allowYouthWeight: false,
};
const ids = (input: Partial<TipInput>) => coachTips({ ...base, ...input }).map((t) => t.id);
const event = (kind: string, startsOn: string, endsOn = startsOn, id = `${kind}-${startsOn}`) => ({
  id,
  kind,
  title: kind,
  startsOn,
  endsOn,
});

describe("the coach's tips", () => {
  it("says nothing on a quiet day", () => {
    expect(ids({})).toEqual([]);
  });

  it("brings up a race, an exam and a camp that are coming", () => {
    expect(ids({ events: [event("race", "2026-09-20")] })).toContain("raceSoon");
    expect(ids({ events: [event("exam", "2026-09-25")] })).toContain("examSoon");
    expect(ids({ events: [event("camp", "2026-10-02", "2026-10-06")] })).toContain("campSoon");
    expect(ids({ events: [event("race", "2026-10-20")] })).not.toContain("raceSoon");
    expect(ids({ events: [event("race", "2026-09-01")] })).not.toContain("raceSoon");
  });

  it("warns of a stage race longer than DCU allows a class on the team", () => {
    const race = event("race", "2026-10-20", "2026-10-24");
    const tips = coachTips({ ...base, events: [race] });
    expect(tips[0]).toMatchObject({
      id: "stageTooLong",
      section: "classes",
      values: { days: 5, limit: 4, category: "U19" },
    });
    const u23 = { ...base, riders: [{ category: "U23", yearInClass: 1, sex: null }] };
    expect(coachTips({ ...u23, events: [race] }).map((t) => t.id)).not.toContain("stageTooLong");
  });

  it("follows the season: new classes in October and November, strength in November, heat in summer", () => {
    const newU17 = [{ category: "U17", yearInClass: 1, sex: null }];
    expect(ids({ today: "2026-10-05", riders: newU17 })).toContain("newClassU17");
    expect(ids({ today: "2027-01-05", riders: newU17 })).not.toContain("newClassU17");
    expect(ids({ today: "2026-11-03" })).toContain("strengthWinter");
    expect(ids({ today: "2027-07-10" })).toContain("heat");
  });

  it("reminds of the child certificate while the team has first-year U17 riders", () => {
    expect(ids({ riders: [{ category: "U17", yearInClass: 1, sex: null }] })).toContain(
      "childCertificate",
    );
    expect(ids({ riders: [{ category: "U17", yearInClass: 2, sex: null }] })).not.toContain(
      "childCertificate",
    );
  });

  it("speaks of wellbeing when a rider is flagged, and of weight when the team records it", () => {
    expect(ids({ flagKinds: ["wellbeing_talk"] })).toContain("wellbeing");
    expect(ids({ allowYouthWeight: true })).toContain("weightOn");
  });

  it("gives each race its own key, so putting one away does not hide the next", () => {
    const tips = coachTips({
      ...base,
      events: [event("race", "2026-09-20", "2026-09-20", "a")],
    });
    const next = coachTips({ ...base, events: [event("race", "2026-09-22", "2026-09-22", "b")] });
    expect(tips[0]!.key).not.toBe(next[0]!.key);
  });

  it("shows a few at most", () => {
    const busy = coachTips({
      ...base,
      today: "2026-11-03",
      riders: [
        { category: "U17", yearInClass: 1, sex: null },
        { category: "U19", yearInClass: 1, sex: null },
      ],
      events: [
        event("race", "2026-11-05"),
        event("exam", "2026-11-06"),
        event("camp", "2026-11-10"),
      ],
      flagKinds: ["wellbeing_help"],
      allowYouthWeight: true,
    });
    expect(busy).toHaveLength(MAX_TIPS);
  });
});
