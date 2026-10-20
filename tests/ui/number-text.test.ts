import { describe, expect, it } from "vitest";
import {
  numberText,
  readNumber,
  stepNumber,
  typeNumber,
  type NumberBounds,
} from "@/components/ui/number-text";

/**
 * A number field keeps what is typed and hands on the number it stands
 * for, so an emptied field no longer snaps back to its floor and its
 * first digit can be deleted.
 */

/** A month's hours in the season plan: 0 to 200, decimals, empty is nought. */
const hours: NumberBounds = { min: 0, max: 200, decimals: true, empty: 0 };
/** A strength exercise's seconds: 5 to 600, whole, empty is the floor. */
const seconds: NumberBounds = { min: 5, max: 600, decimals: false, empty: 5 };
/** A cadence that may be left out: empty is no number. */
const cadence: NumberBounds = { min: 0, max: 200, decimals: false, empty: null };

describe("reading what is typed", () => {
  it("takes a comma or a point as the decimal mark", () => {
    expect(readNumber("1,5")).toBe(1.5);
    expect(readNumber("1.5")).toBe(1.5);
    expect(readNumber(",5")).toBe(0.5);
    expect(readNumber("12")).toBe(12);
  });

  it("reads a number still being typed as far as it goes", () => {
    expect(readNumber("1,")).toBe(1);
    expect(readNumber("07")).toBe(7);
  });

  it("says no number for an empty field or a lone mark", () => {
    expect(readNumber("")).toBeNull();
    expect(readNumber(",")).toBeNull();
    expect(readNumber(".")).toBeNull();
  });
});

describe("typing into a number field", () => {
  it("lets the field be emptied and hands on its floor meanwhile", () => {
    expect(typeNumber("", hours, "da")).toEqual({ text: "", value: 0 });
    expect(typeNumber("", seconds, "da")).toEqual({ text: "", value: 5 });
  });

  it("hands on no number when an optional field is emptied", () => {
    expect(typeNumber("", cadence, "da")).toEqual({ text: "", value: null });
  });

  it("keeps a decimal mark waiting for its digits", () => {
    expect(typeNumber("1,", hours, "da")).toEqual({ text: "1,", value: 1 });
    expect(typeNumber("1,5", hours, "da")).toEqual({ text: "1,5", value: 1.5 });
    expect(typeNumber("2.25", hours, "en")).toEqual({ text: "2.25", value: 2.25 });
    expect(typeNumber(",", hours, "da")).toEqual({ text: ",", value: 0 });
  });

  it("keeps a number below the floor as typed, since the next digit may lift it", () => {
    expect(typeNumber("3", seconds, "da")).toEqual({ text: "3", value: 5 });
    expect(typeNumber("30", seconds, "da")).toEqual({ text: "30", value: 30 });
  });

  it("shows the ceiling at once when the number passes it", () => {
    expect(typeNumber("250", hours, "da")).toEqual({ text: "200", value: 200 });
    expect(typeNumber("200,5", hours, "da")).toEqual({ text: "200", value: 200 });
    expect(typeNumber("6000", seconds, "da")).toEqual({ text: "600", value: 600 });
  });

  it("keeps leading zeros while typing and reads past them", () => {
    expect(typeNumber("05", hours, "da")).toEqual({ text: "05", value: 5 });
  });

  it("drops spaces", () => {
    expect(typeNumber(" 12 ", hours, "da")).toEqual({ text: "12", value: 12 });
  });

  it("refuses what is not a number", () => {
    expect(typeNumber("1a", hours, "da")).toBeNull();
    expect(typeNumber("1,5,", hours, "da")).toBeNull();
    expect(typeNumber("1,5.", hours, "da")).toBeNull();
    expect(typeNumber("-1", hours, "da")).toBeNull();
    expect(typeNumber("1e3", hours, "da")).toBeNull();
  });

  it("refuses a decimal mark in a whole-number field", () => {
    expect(typeNumber("1,", seconds, "da")).toBeNull();
    expect(typeNumber("1.5", seconds, "en")).toBeNull();
  });
});

describe("showing a number in the field", () => {
  it("writes the decimal mark the reader uses", () => {
    expect(numberText(1.5, "da")).toBe("1,5");
    expect(numberText(1.5, "en")).toBe("1.5");
    expect(numberText(40, "da")).toBe("40");
    expect(numberText(0, "da")).toBe("0");
  });

  it("shows no number as an empty field", () => {
    expect(numberText(null, "da")).toBe("");
    expect(numberText(undefined, "da")).toBe("");
    expect(numberText(Number.NaN, "da")).toBe("");
  });
});

describe("stepping with the arrow keys", () => {
  it("steps within the bounds", () => {
    expect(stepNumber(40, 1, hours)).toBe(41);
    expect(stepNumber(0, -1, hours)).toBe(0);
    expect(stepNumber(200, 1, hours)).toBe(200);
    expect(stepNumber(5, -1, seconds)).toBe(5);
  });

  it("leaves no float dust on a decimal step", () => {
    expect(stepNumber(0.7, 0.1, { min: 0, max: 16 })).toBe(0.8);
    expect(stepNumber(7.5, 0.1, { min: 0, max: 16 })).toBe(7.6);
  });

  it("starts an empty field from its floor", () => {
    expect(stepNumber(null, 1, cadence)).toBe(0);
    expect(stepNumber(null, 1, seconds)).toBe(5);
  });
});
