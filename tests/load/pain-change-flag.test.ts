import { describe, expect, it } from "vitest";
import { painChangesFlag } from "@/modules/load";

/** Sessions moved or skipped for pain twice in a week (docs/adr/0118). */
describe("changes for pain", () => {
  const today = "2026-11-27";
  it("warn the coach the second time in seven days", () => {
    expect(
      painChangesFlag(
        [
          { fromDate: "2026-11-25", reason: "pain" },
          { fromDate: "2026-11-27", reason: "pain" },
          { fromDate: "2026-11-26", reason: "ill" },
        ],
        today,
      ),
    ).toEqual({ kind: "changed_for_pain", severity: "warn", values: { count: 2 } });
  });

  it("say nothing for one, or for two a week apart", () => {
    expect(painChangesFlag([{ fromDate: "2026-11-25", reason: "pain" }], today)).toBeNull();
    expect(
      painChangesFlag(
        [
          { fromDate: "2026-11-19", reason: "pain" },
          { fromDate: "2026-11-26", reason: "pain" },
        ],
        today,
      ),
    ).toBeNull();
  });
});
