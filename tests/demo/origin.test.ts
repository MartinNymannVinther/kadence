import { describe, expect, it } from "vitest";
import { arrivalHost, arrivalOrigin } from "@/modules/demo/origin";

const declared = "http://devbox.example.ts.net:3007";
const trusted = ["http://localhost:3007", "http://192.0.2.10:3007"];

describe("the origin a demo lands on", () => {
  it("is the one the visitor came in by, when the installation trusts it", () => {
    expect(arrivalOrigin("192.0.2.10:3007", declared, trusted).origin).toBe(
      "http://192.0.2.10:3007",
    );
    expect(arrivalOrigin("LOCALHOST:3007", declared, trusted).origin).toBe("http://localhost:3007");
    expect(arrivalOrigin("devbox.example.ts.net:3007", declared, trusted).origin).toBe(declared);
  });

  it("is the declared one for any host it was not told about, or none", () => {
    expect(arrivalOrigin("evil.example", declared, trusted).origin).toBe(declared);
    // The right name on the wrong port is another origin.
    expect(arrivalOrigin("192.0.2.10:4000", declared, trusted).origin).toBe(declared);
    expect(arrivalOrigin(null, declared, trusted).origin).toBe(declared);
    expect(arrivalOrigin("", declared, []).origin).toBe(declared);
  });

  it("keeps the configured origin's protocol, never the request's", () => {
    const origin = arrivalOrigin("kadence.haij.dk", "https://kadence.haij.dk", []);
    expect(origin.protocol).toBe("https:");
    expect(origin.origin).toBe("https://kadence.haij.dk");
  });

  it("reads the host a proxy forwarded before its own, the first of several", () => {
    const behind = new Headers({
      host: "0.0.0.0:3000",
      "x-forwarded-host": "kadence.haij.dk, proxy.internal",
    });
    expect(arrivalHost(behind)).toBe("kadence.haij.dk, proxy.internal");
    expect(arrivalOrigin(arrivalHost(behind), "https://kadence.haij.dk", []).origin).toBe(
      "https://kadence.haij.dk",
    );
    expect(arrivalHost(new Headers({ host: "192.0.2.10:3007" }))).toBe("192.0.2.10:3007");
  });
});
