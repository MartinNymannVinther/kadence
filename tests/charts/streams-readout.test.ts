import { describe, expect, it } from "vitest";
import { readoutText } from "@/components/activities/streams-readout";

/** The line above the curves says the most pressing thing first. */

const t = (key: string, values?: Record<string, string | number>) =>
  values
    ? `${key} ${Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")}`
    : key;
const stamp = (px: number) => `@${px}`;
const values = [
  { label: "Watt", text: "240 W" },
  { label: "Puls", text: "–" },
];
const idle = {
  t,
  band: null,
  edge: null,
  armed: false,
  coarse: false,
  select: "Vælg et område",
  at: null,
  clock: "",
  values: [],
  stamp,
};
const reading = { ...idle, at: 3, clock: "0:15", values };

describe("readoutText", () => {
  it("puts a band being dragged first, its ends in order", () => {
    const text = readoutText({ ...reading, band: [300, 100], edge: 50, armed: true });
    expect(text).toBe("selecting from=@100 to=@300");
  });

  it("then a start set by a tap", () => {
    expect(readoutText({ ...reading, edge: 50, armed: true })).toBe("edgeSet time=@50");
    expect(readoutText({ ...idle, edge: 50 })).toBe("edgeSet time=@50");
  });

  it("tells a finger to turn the mode off instead of pressing Esc, by the button's name", () => {
    expect(readoutText({ ...reading, edge: 50, armed: true, coarse: true })).toBe(
      "edgeSetTouch time=@50 select=Vælg et område",
    );
    const dragged = readoutText({ ...reading, band: [300, 100], edge: 50, coarse: true });
    expect(dragged).toBe("selecting from=@100 to=@300");
  });

  it("then the mode's own instruction, even over a reading a tap has pinned", () => {
    expect(readoutText({ ...idle, armed: true })).toBe("selectHint");
    expect(readoutText({ ...reading, armed: true })).toBe("selectHint");
  });

  it("then the values at the point being read", () => {
    expect(readoutText(reading)).toBe("0:15 · Watt 240 W · Puls –");
  });

  it("and nothing when nothing is happening, so the chart can say how to begin", () => {
    expect(readoutText(idle)).toBeNull();
  });
});
