import { describe, expect, it } from "vitest";
import da from "../../messages/da.json";
import en from "../../messages/en.json";
import {
  addressesIn,
  LINE_PROBLEM_CODES,
  LIST_PROBLEM_CODES,
  MAX_RIDERS,
  nameKey,
  parseTeamList,
  type ParsedList,
} from "@/modules/team/bulk-parse";

/**
 * The list a coach pastes into "Inviter hele holdet" (docs/adr/0064):
 * what reads, and every way a line is refused with its number and a
 * reason before anything is created.
 */

const THIS_YEAR = 2026;
const read = (text: string, sharedYear: number | null = null): ParsedList =>
  parseTeamList(text, { sharedYear, thisYear: THIS_YEAR });
const codes = (parsed: ParsedList) => parsed.problems.map((p) => [p.line, p.code]);

describe("a list that reads", () => {
  it("takes a rider, a year, an address and two parents", () => {
    const parsed = read(
      "Emma Holm, 2010, Emma@Holm.dk; Anne Holm, anne@holm.dk; Peter Holm\nOskar Lund, 2009",
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.listProblem).toBeNull();
    expect(parsed.lines).toEqual([
      {
        line: 1,
        rider: { name: "Emma Holm", birthYear: 2010, email: "emma@holm.dk" },
        parents: [
          { name: "Anne Holm", email: "anne@holm.dk" },
          { name: "Peter Holm", email: null },
        ],
      },
      { line: 2, rider: { name: "Oskar Lund", birthYear: 2009, email: null }, parents: [] },
    ]);
  });

  it("reads the fields in any order, with spaces, tabs or brackets", () => {
    const parsed = read(
      "emma@holm.dk, 2010, Emma Holm\nOskar  Lund 2009 <oskar@lund.dk>\nIda Berg\t2011\tida@berg.dk",
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.lines.map((l) => l.rider)).toEqual([
      { name: "Emma Holm", birthYear: 2010, email: "emma@holm.dk" },
      { name: "Oskar Lund", birthYear: 2009, email: "oskar@lund.dk" },
      { name: "Ida Berg", birthYear: 2011, email: "ida@berg.dk" },
    ]);
  });

  it("uses the shared year where a line has none, and the line's own where it has", () => {
    const parsed = read("Emma Holm\nOskar Lund, 2008", 2010);
    expect(parsed.lines.map((l) => l.rider.birthYear)).toEqual([2010, 2008]);
  });

  it("skips blank lines, counts them, and keeps the line numbers of the text", () => {
    const parsed = read("\nEmma Holm, 2010\n   \n\nOskar Lund, 2009\n\n");
    expect(parsed.blank).toBe(3);
    expect(parsed.lines.map((l) => l.line)).toEqual([2, 5]);
  });

  it("ignores an empty part after a trailing semicolon", () => {
    const parsed = read("Emma Holm, 2010;  ;");
    expect(parsed.problems).toEqual([]);
    expect(parsed.lines[0]?.parents).toEqual([]);
  });

  it("lets siblings share a parent, who gets one link", () => {
    const parsed = read(
      "Emma Holm, 2010; Anne Holm, anne@holm.dk\nIda Holm, 2012; anne holm, anne@holm.dk",
    );
    expect(parsed.problems).toEqual([]);
    expect(addressesIn(parsed.lines)).toEqual(["anne@holm.dk"]);
  });
});

describe("a list that is refused as a whole", () => {
  it("is empty", () => {
    expect(read("").listProblem).toBe("empty");
    expect(read("\n  \n").listProblem).toBe("empty");
  });

  it(`is longer than ${MAX_RIDERS} riders`, () => {
    const lines = Array.from(
      { length: MAX_RIDERS + 1 },
      (_, i) => `Rytter ${"x".repeat(i + 1)}, 2010`,
    );
    expect(read(lines.join("\n")).listProblem).toBe("tooMany");
    expect(read(lines.slice(0, MAX_RIDERS).join("\n")).listProblem).toBeNull();
  });

  it("has a shared year no rider can have", () => {
    expect(read("Emma Holm", 2024).listProblem).toBe("sharedYear");
    expect(read("Emma Holm", 1900).listProblem).toBe("sharedYear");
  });
});

describe("a line that is refused", () => {
  it("has no year and the list has none", () => {
    expect(codes(read("Emma Holm"))).toEqual([[1, "noYear"]]);
  });

  it("has a year no rider can have, or two", () => {
    const parsed = read("Emma Holm, 2020\nOskar Lund, 1899\nIda Berg, 2010, 2011");
    expect(codes(parsed)).toEqual([
      [1, "badYear"],
      [2, "badYear"],
      [3, "twoYears"],
    ]);
    expect(parsed.problems[0]?.value).toBe("2020");
    expect(parsed.lines).toEqual([]);
  });

  it("has a number that is not a year", () => {
    const parsed = read("Emma Holm, 10\nOskar Lund, 2009-05-03");
    expect(codes(parsed)).toEqual([
      [1, "unreadable"],
      [1, "noYear"],
      [2, "unreadable"],
      [2, "noYear"],
    ]);
    expect(parsed.problems[2]?.value).toBe("2009-05-03");
  });

  it("has no name, or two before the semicolon", () => {
    const parsed = read(", 2010, emma@holm.dk\nEmma Holm, Anne Holm, 2010\n2010; Anne Holm");
    expect(codes(parsed)).toEqual([
      [1, "noName"],
      [2, "twoNames"],
      [3, "noName"],
    ]);
    expect(parsed.problems[1]?.value).toBe("Anne Holm");
  });

  it("has a name longer than a rider's", () => {
    expect(codes(read(`${"Emma ".repeat(30)}, 2010`))).toEqual([[1, "nameTooLong"]]);
  });

  it("has an address that is not one, or two for one person", () => {
    const parsed = read("Emma Holm, 2010, emma@\nOskar Lund, 2009, a@lund.dk, b@lund.dk");
    expect(codes(parsed)).toEqual([
      [1, "badEmail"],
      [2, "twoEmails"],
    ]);
    expect(parsed.problems[0]?.value).toBe("emma@");
  });

  it("gives a parent a year", () => {
    expect(codes(read("Emma Holm, 2010; Anne Holm, 1980"))).toEqual([[1, "parentYear"]]);
  });

  it("has more than two parents", () => {
    expect(codes(read("Emma Holm, 2010; Anne; Peter; Mormor"))).toEqual([[1, "tooManyParents"]]);
  });

  it("names a rider twice, also in other spelling", () => {
    const parsed = read("Emma Holm, 2010\nOskar Lund, 2009\nemma  holm, 2011");
    expect(parsed.problems).toEqual([{ line: 3, code: "sameName", value: "emma holm", other: 1 }]);
  });

  it("gives two people the same address", () => {
    const parsed = read(
      [
        "Emma Holm, 2010, holm@mail.dk",
        "Oskar Lund, 2009, holm@mail.dk",
        "Ida Berg, 2011; Anne Berg, berg@mail.dk",
        "Eva Berg, 2012; Karin Berg, berg@mail.dk",
        "Bo Ny, 2010, ny@mail.dk; Lis Ny, ny@mail.dk",
        "Jens Ny, 2011; Lis Ny; Lis Ny",
      ].join("\n"),
    );
    expect(parsed.problems).toEqual([
      { line: 2, code: "sameEmail", value: "holm@mail.dk", other: 1 },
      { line: 4, code: "sameEmail", value: "berg@mail.dk", other: 3 },
      { line: 5, code: "twiceOnLine", value: "ny@mail.dk" },
      { line: 6, code: "twiceOnLine", value: "Lis Ny" },
    ]);
  });

  it("refuses a rider's address used by a parent elsewhere", () => {
    const parsed = read("Emma Holm, 2010; Anne Holm, anne@holm.dk\nAnne Holm, 2008, anne@holm.dk");
    expect(codes(parsed)).toEqual([[2, "sameEmail"]]);
  });

  it("keeps the good lines apart from the refused ones", () => {
    const parsed = read("Emma Holm, 2010\nOskar Lund\nIda Berg, 2011");
    expect(codes(parsed)).toEqual([[2, "noYear"]]);
    expect(parsed.lines.map((l) => l.line)).toEqual([1, 3]);
  });
});

describe("names", () => {
  it("compare without case or extra spaces", () => {
    expect(nameKey("  Emma   HOLM ")).toBe(nameKey("emma holm"));
    expect(nameKey("Ærø Østergård")).toBe("ærø østergård");
  });
});

describe("every refusal", () => {
  // The preview builds these keys at runtime, which tests/i18n cannot follow.
  it("has its sentence in Danish and English", () => {
    for (const catalogue of [da, en]) {
      const bulk = catalogue.riders.bulk as {
        problem: Record<string, string>;
        whole: Record<string, string>;
      };
      for (const code of LINE_PROBLEM_CODES) expect(bulk.problem[code], code).toBeTypeOf("string");
      for (const code of LIST_PROBLEM_CODES) expect(bulk.whole[code], code).toBeTypeOf("string");
    }
  });
});
