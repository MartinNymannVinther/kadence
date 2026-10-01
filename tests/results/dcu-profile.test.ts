import { describe, expect, it } from "vitest";
import { danishDate, DcuPageError, parseDcuProfile } from "@/modules/results/dcu-profile";
import { heading, PAGE, profilePage, row, UCI } from "./profile-fixture";

describe("a rider's page at Cykling Danmark", () => {
  it("reads every race with its class, date, place and result list", () => {
    const { results, skipped } = parseDcuProfile(PAGE, UCI);
    expect(skipped).toBe(0);
    expect(results).toHaveLength(8);
    expect(results[0]).toEqual({
      sourceRef: "17626:101613",
      race: "Demin Cup Finalen 2026 - Holbæk CS",
      discipline: "Landevej",
      raceClass: "U17",
      racedOn: "2026-09-13",
      place: 11,
      placeNote: "",
      resultUrl: "https://www.sportstiming.dk/event/17626/results?round=101613",
    });
    expect(results[2]!.race).toBe("B&U DM Linjeløb - Vejle CK 2026");
    expect(results.find((r) => r.sourceRef === "16000:")).toMatchObject({
      raceClass: "U15",
      racedOn: "2025-06-15",
      resultUrl: "https://www.sportstiming.dk/event/16000/results",
    });
  });

  it("keeps what stood in place of a place, and never makes it a number", () => {
    const dnf = parseDcuProfile(PAGE, UCI).results.find((r) => r.sourceRef === "17500:100700");
    expect(dnf).toMatchObject({ place: null, placeNote: "DNF" });
  });

  it("leaves DCU's points out", () => {
    for (const result of parseDcuProfile(PAGE, UCI).results)
      expect(Object.keys(result)).not.toContain("points");
  });

  it("refuses a page that is not a member's profile", () => {
    expect(() => parseDcuProfile("<html><body>Log ind</body></html>", UCI)).toThrow(DcuPageError);
  });

  it("refuses someone else's page", () => {
    try {
      parseDcuProfile(profilePage("", "10099999999"), UCI);
      expect.unreachable();
    } catch (error) {
      expect((error as DcuPageError).code).toBe("wrong_rider");
    }
  });

  it("reads a rider without results as no races", () => {
    expect(parseDcuProfile(profilePage(""), UCI)).toEqual({ results: [], skipped: 0 });
  });

  it("skips and counts a row that links anywhere but Sportstiming's result lists", () => {
    const page = profilePage(
      heading("Cross - U17 (2026)") +
        row("Cross-Cup I", 19000, 1, "4. oktober 2026", "5").replaceAll(
          "https://www.sportstiming.dk",
          "https://evil.example",
        ) +
        row("Cross-Cup II", 19001, 2, "1. november 2026", "7"),
    );
    const { results, skipped } = parseDcuProfile(page, UCI);
    expect(skipped).toBe(1);
    expect(results.map((r) => r.race)).toEqual(["Cross-Cup II"]);
    expect(results[0]!.discipline).toBe("Cross");
  });

  it("skips a row whose date it does not know rather than guessing one", () => {
    const page = profilePage(heading("Landevej - U17 (2026)") + row("Løb", 1, 2, "snart", "1"));
    expect(parseDcuProfile(page, UCI)).toEqual({ results: [], skipped: 1 });
  });

  it("skips rows under a heading it cannot read", () => {
    const page = profilePage(heading("Noget andet") + row("Løb", 1, 2, "1. maj 2026", "1"));
    expect(parseDcuProfile(page, UCI)).toEqual({ results: [], skipped: 1 });
  });

  it("reads a result listed twice once", () => {
    const twice = row("Greve CC 2026", 17614, 101512, "6. september 2026", "3");
    const page = profilePage(heading("Landevej - U17 (2026)") + twice + twice);
    expect(parseDcuProfile(page, UCI).results).toHaveLength(1);
  });
});

describe("a Danish date", () => {
  it("reads the portal's dates", () => {
    expect(danishDate("13. september 2026")).toBe("2026-09-13");
    expect(danishDate("1. marts 2025")).toBe("2025-03-01");
    expect(danishDate("5. okt. 2026")).toBe("2026-10-05");
  });

  it("refuses what is not one", () => {
    expect(danishDate("31. februar 2026")).toBeNull();
    expect(danishDate("13. septober 2026")).toBeNull();
    expect(danishDate("2026-09-13")).toBeNull();
    expect(danishDate("")).toBeNull();
  });
});
