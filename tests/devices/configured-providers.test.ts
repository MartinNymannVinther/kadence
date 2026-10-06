import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredProviders, PROVIDER_IDS, providerById } from "@/modules/devices/providers";

/**
 * The devices page offers only the providers this installation has keys
 * for (docs/adr/0057); with none, rides come in as files. Each provider's
 * own answer is stood in for, so the developer's .env does not decide.
 */

function withKeys(...ids: string[]) {
  for (const id of PROVIDER_IDS)
    vi.spyOn(providerById(id), "configured").mockReturnValue(ids.includes(id));
}

afterEach(() => vi.restoreAllMocks());

describe("the providers offered", () => {
  it("are none without keys", () => {
    withKeys();
    expect(configuredProviders()).toEqual([]);
  });

  it("are only those with keys, in their order", () => {
    withKeys("polar", "wahoo");
    expect(configuredProviders()).toEqual(["wahoo", "polar"]);
  });
});
