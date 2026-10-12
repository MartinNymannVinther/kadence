import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dcuPicks, kadencePicks } from "@/components/rulle/ready/choices";
import { buildWorkoutPrompt, classLine } from "@/modules/assist/build-workout-prompt";
import { workoutNotes } from "@/modules/assist/build-workout-answer";
import { groupWeekPrompt } from "@/modules/assist/group-week";
import { weekDraftPrompt } from "@/modules/assist/week-draft-prompt";
import { strengthNotes } from "@/modules/training/recurrence";
import { parseWorkoutText } from "@/modules/workouts/parse-text";

/**
 * Nothing changes for U17–U23 (docs/adr/0092): what a youth rider's
 * Rulle picker offers, the words "Byg med AI", "Foreslå ugen" and the
 * group's week send the model for a youth class, and the strength series'
 * notes are byte for byte what they were before Kadence's content for
 * adults arrived. The hashes were taken from main at aa312a0 with the
 * same inputs; a change here is a change for young riders and needs a
 * reason of its own.
 */

const h = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const templates = [{ id: "tpl_1", name: "Styrke U19", sport: "strength", minutes: 60 }];
const events = [
  { kind: "race", title: "Løb", from: "2026-11-07", to: "2026-11-07", priority: "A" },
];

describe("a youth rider's prompts and picker", () => {
  it("are as they were before Kadence's content for adults", () => {
    expect(kadencePicks("da", null)).toEqual([]);
    expect({
      rulleDa: h(dcuPicks("da")),
      rulleEn: h(dcuPicks("en")),
      buildBike: h(
        buildWorkoutPrompt({
          sport: "bike",
          text: "3x10 Z4",
          category: "U19",
          current: null,
          locale: "da",
        }),
      ),
      buildStrength: h(
        buildWorkoutPrompt({
          sport: "strength",
          text: "ben og core",
          category: "U19",
          current: null,
          locale: "da",
        }),
      ),
      buildBikeUnguided: h(
        buildWorkoutPrompt({
          sport: "bike",
          text: "3x10 Z4",
          category: "U17",
          current: null,
          locale: "en",
          guided: false,
        }),
      ),
      classLines: h([
        classLine("bike", "U19"),
        classLine("strength", "U19"),
        classLine("bike", "U23", false),
      ]),
      notes: h(workoutNotes(parseWorkoutText("6 t Z2")!, "U19")),
      group: h(
        groupWeekPrompt(
          {
            monday: "2026-11-02",
            guided: true,
            basis: "U19-1",
            wish: "to hårde pas",
            events,
            templates,
          },
          "da",
        ),
      ),
      groupUnguided: h(
        groupWeekPrompt(
          { monday: "2027-04-05", guided: false, basis: "U17-2", wish: "", events, templates },
          "en",
        ),
      ),
      weekDraft: h(
        weekDraftPrompt(
          {
            monday: "2026-11-02",
            guided: true,
            category: "U19",
            basis: "U19-1",
            phase: "base",
            corridor: { low: 8, target: 10, high: 12 },
            senior: null,
            strength: { min: 2, max: 3 },
            planned: [],
            events,
            recentWeeks: [8, 9],
            flags: [],
            templates,
          },
          "da",
        ),
      ),
      strength: h(strengthNotes("2026-11-02", { weekdays: [1, 2, 4], until: "2026-12-20" })),
    }).toEqual(BEFORE);
  });
});

/** Taken on main at aa312a0, before this change. */
const BEFORE = {
  rulleDa: "2f384b485a6d45ea44d244af70fab31b095140a919760b1ca056ff4d5e30cee7",
  rulleEn: "ccb456ae1d21c9f2fbdc3cef4c086c2ada0f2afbc19be3b763e38cf244ef8848",
  buildBike: "691af77836c1269d10e355cd083ac5cd71a10f042e27c71a7f67fdd659a49406",
  buildStrength: "1faf8cd7e92d7a331dcba7463d01d864c553060ad32b235f1338559d64cfae86",
  buildBikeUnguided: "d96b81621478df3e989b695850c784ce55e1d1e2fddf8e121124cb1699e45cc3",
  classLines: "435bf43a5917c1502e428707766c47d5068fabaffcc4194372fcf6948a6da85e",
  notes: "af0100329cf587bf17553fb295afb350a859750e9bc9181d718b1e75e9e49d12",
  group: "d85a2b7dd57ddce1fe36cd8b468ed21025d7972b47756e2a576eaf8ce965340e",
  groupUnguided: "eb3da0aa7d96c08cea2018870e696ac37fee8333490c774f0c112e1d1979c75b",
  weekDraft: "75465578a273ccd043dc1e5bb4a0bbb2a552843e12f481763ee65660e6044a4f",
  strength: "998300967b25c6a0552aa26e0d2b6c3c9d38441438def904371b869535023b75",
};
