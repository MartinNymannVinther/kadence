import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { demoSignupHeaderValue, isDemoSignup } from "@/core/auth/signup";
import { env } from "@/core/env";

/**
 * The demo's key to the sign-up door (docs/adr/0083). It was drawn at
 * random when the process started, so only that process knew it; now it
 * is an HMAC under BETTER_AUTH_SECRET over the UTC day, so every instance
 * knows it and nobody without the secret does.
 */

const at = (iso: string) => new Date(iso);
const NOON = at("2026-10-11T12:00:00Z");

describe("the demo's nonce", () => {
  it("is the same on every instance on the same day: it depends on the secret and the day only", () => {
    expect(demoSignupHeaderValue(NOON)).toBe(demoSignupHeaderValue(at("2026-10-11T00:00:01Z")));
    expect(demoSignupHeaderValue(NOON)).toBe(
      createHmac("sha256", env.BETTER_AUTH_SECRET)
        .update("kadence-demo-signup:2026-10-11")
        .digest("base64url"),
    );
  });

  it("changes with the day", () => {
    expect(demoSignupHeaderValue(NOON)).not.toBe(demoSignupHeaderValue(at("2026-10-12T12:00:00Z")));
  });

  it("is accepted today and yesterday, so a demo begun before midnight finishes after it", () => {
    const lateLastNight = demoSignupHeaderValue(at("2026-10-10T23:59:59Z"));
    expect(isDemoSignup(demoSignupHeaderValue(NOON), NOON)).toBe(true);
    expect(isDemoSignup(lateLastNight, at("2026-10-11T00:00:02Z"))).toBe(true);
    expect(isDemoSignup(lateLastNight, at("2026-10-12T00:00:02Z"))).toBe(false);
  });

  it("is not accepted from tomorrow, nor under another secret", () => {
    expect(isDemoSignup(demoSignupHeaderValue(at("2026-10-12T12:00:00Z")), NOON)).toBe(false);
    const forged = createHmac("sha256", "another installation's secret")
      .update("kadence-demo-signup:2026-10-11")
      .digest("base64url");
    expect(isDemoSignup(forged, NOON)).toBe(false);
  });

  it("refuses a flag, an empty header and something of another length", () => {
    for (const value of ["1", "true", "", null, undefined, "x".repeat(200)])
      expect(isDemoSignup(value, NOON)).toBe(false);
  });
});
