import { describe, expect, it } from "vitest";
import { toZwo } from "@/modules/workouts/export";
import type { BikeStructure } from "@/modules/workouts/structure";
import { mixed, threshold } from "./fixtures";

describe("a Zwift workout", () => {
  const zwo = toZwo(threshold, "Threshold 3x10", "Three by ten at threshold.");

  it("says who wrote it, what it is called and that it is for the bike", () => {
    expect(zwo).toMatch(/^<workout_file>\n/);
    expect(zwo).toContain("<author>Kadence</author>");
    expect(zwo).toContain("<name>Threshold 3x10</name>");
    expect(zwo).toContain("<description>Three by ten at threshold.</description>");
    expect(zwo).toContain("<sportType>bike</sportType>");
    expect(zwo.trim()).toMatch(/<\/workout_file>$/);
  });

  it("writes an on/off repeat as IntervalsT at the middle of each zone", () => {
    expect(zwo).toContain(
      '<IntervalsT Repeat="3" OnDuration="600" OffDuration="300" OnPower="0.98" OffPower="0.5" Cadence="90"/>',
    );
  });

  it("writes the warmup and cooldown flat", () => {
    expect(zwo).toContain('<Warmup Duration="600" PowerLow="0.65" PowerHigh="0.65"/>');
    expect(zwo).toContain('<Cooldown Duration="600" PowerLow="0.5" PowerHigh="0.5"/>');
  });

  it("turns a share of FTP, a pulse, an RPE and no target into power or free riding", () => {
    const text = toZwo(mixed, "Mixed");
    expect(text).toContain('<SteadyState Duration="1200" Power="0.75">');
    expect(text).toContain('<textevent timeoffset="0" message="Tempo &amp; &lt;cadence&gt;"/>');
    // 81–89 % of threshold pulse is zone 2, ridden at zone 2's power, 65 % of FTP
    expect(text).toContain('<SteadyState Duration="900" Power="0.65"/>');
    expect(text).toContain('<FreeRide Duration="60"/>');
    expect(text).toContain('<FreeRide Duration="300"/>');
  });

  it("escapes the name and description", () => {
    const text = toZwo(threshold, `Bakke & "sprint" <U17>`, "a\u0001b");
    expect(text).toContain("<name>Bakke &amp; &quot;sprint&quot; &lt;U17&gt;</name>");
    expect(text).toContain("<description>ab</description>");
  });

  it("writes out a repeat that is not one on/off pair", () => {
    const pyramid: BikeStructure = {
      kind: "bike",
      steps: [
        {
          kind: "repeat",
          times: 2,
          steps: [
            { kind: "step", intent: "work", seconds: 60, target: { kind: "zone", zone: 5 } },
            { kind: "step", intent: "work", seconds: 120, target: { kind: "zone", zone: 4 } },
            { kind: "step", intent: "recover", seconds: 60, target: { kind: "zone", zone: 1 } },
          ],
        },
      ],
    };
    const text = toZwo(pyramid, "Pyramid");
    expect(text).not.toContain("IntervalsT");
    expect(text.match(/<SteadyState /g)).toHaveLength(6);
    expect(text).toContain('<SteadyState Duration="60" Power="1.13"/>');
  });
});
