import { describe, expect, it } from "vitest";
import { providerOrigin } from "@/modules/devices/origin";

/**
 * Which configured providers are American and which are inside the EU
 * (P2-10): the devices page names only these, never the ones this
 * installation has no keys for. Pure, no database.
 */

describe("provider origin", () => {
  it("names nobody without any provider configured", () => {
    expect(providerOrigin([])).toEqual({ us: [], eu: [] });
  });

  it("puts Wahoo and Garmin in the American group, in PROVIDER_IDS order", () => {
    expect(providerOrigin(["garmin", "wahoo"])).toEqual({ us: ["wahoo", "garmin"], eu: [] });
  });

  it("puts Polar alone in the EU group", () => {
    expect(providerOrigin(["polar"])).toEqual({ us: [], eu: ["polar"] });
  });

  it("splits a mix of both into their two groups", () => {
    expect(providerOrigin(["polar", "wahoo"])).toEqual({ us: ["wahoo"], eu: ["polar"] });
  });

  it("never names a provider that is not in the configured list", () => {
    expect(providerOrigin(["wahoo"])).toEqual({ us: ["wahoo"], eu: [] });
  });
});
