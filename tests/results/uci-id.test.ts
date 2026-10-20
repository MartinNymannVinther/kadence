import { describe, expect, it } from "vitest";
import { readsRaces, readsRacesFor } from "@/modules/results/switch";
import { dcuProfileUrl, formatUciId, parseUciId } from "@/modules/results/uci-id";

describe("a UCI ID", () => {
  it("is read as the licence prints it, or as eleven digits", () => {
    expect(parseUciId("100 111 222 33")).toBe("10011122233");
    expect(parseUciId(" 10011122233 ")).toBe("10011122233");
    expect(parseUciId("100.111.222.33")).toBe("10011122233");
  });

  it("is nothing else", () => {
    for (const raw of ["", "1001112223", "100111222334", "DEN20110101", "10011122233; drop"])
      expect(parseUciId(raw)).toBeNull();
  });

  it("is printed in the licence's groups", () => {
    expect(formatUciId("10011122233")).toBe("100 111 222 33");
  });

  it("names the rider's page at the portal, and only for eleven digits", () => {
    expect(dcuProfileUrl("10011122233")).toBe(
      "https://dcumedlem.sportstiming.dk/profile/10011122233",
    );
    expect(() => dcuProfileUrl("../points")).toThrow();
  });
});

describe("whether the installation reads races (DCU_RESULTS)", () => {
  it("reads nobody's when off, everybody's when on", () => {
    expect(readsRacesFor("off", "10011122233")).toBe(false);
    expect(readsRacesFor("on", "10011122233")).toBe(true);
    expect(readsRacesFor("on", null)).toBe(false);
    expect(readsRaces("off")).toBe(false);
  });

  it("reads only the listed riders' when given UCI IDs", () => {
    const setting = "10011122233,10012345678";
    expect(readsRacesFor(setting, "10012345678")).toBe(true);
    expect(readsRacesFor(setting, "10099999999")).toBe(false);
    expect(readsRaces(setting)).toBe(true);
  });
});
