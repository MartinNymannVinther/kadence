import { describe, expect, it } from "vitest";
import { mcpResourceFrom } from "@/core/auth/mcp";
import { leavesTheApp, nextPath } from "@/core/auth/next-path";
import { authorizeQuery } from "@/modules/mcp/authorize-query";
import { refusalFor } from "@/modules/mcp/eligibility";
import { dayRange } from "@/modules/mcp/tools/range";
import { ToolRefusal } from "@/modules/mcp/tool";

/** The small rules around a person's own assistant (docs/adr/0118). Pure. */

describe("who may connect", () => {
  it("is a rider from the year they turn 15", () => {
    expect(refusalFor({ birthYear: 2011 }, 2026)).toBeNull();
    expect(refusalFor({ birthYear: 2012 }, 2026)).toBe("tooYoung");
  });

  it("is not a coach or a parent without a rider row", () => {
    expect(refusalFor(null, 2026)).toBe("notRider");
  });
});

describe("the MCP resource", () => {
  it("is https, or plain http on this machine only", () => {
    expect(mcpResourceFrom("https://kadence.haij.dk")).toBe("https://kadence.haij.dk/api/mcp");
    expect(mcpResourceFrom("http://localhost:3000")).toBe("http://localhost:3000/api/mcp");
    expect(mcpResourceFrom("http://motor:3007")).toBeNull();
  });
});

describe("the way back into authorize after the login", () => {
  it("drops the signature and a request for a fresh login, and keeps the rest", () => {
    const params = new URLSearchParams(
      "client_id=c&scope=kadence%3Aread&prompt=login+consent&max_age=0&sig=x&exp=1&ba_iat=2&ba_param=client_id&state=s",
    );
    const out = new URLSearchParams(authorizeQuery(params));
    expect(out.get("client_id")).toBe("c");
    expect(out.get("state")).toBe("s");
    expect(out.get("prompt")).toBe("consent");
    for (const gone of ["sig", "exp", "ba_iat", "ba_param", "max_age"])
      expect(out.has(gone)).toBe(false);
  });

  it("drops prompt altogether when login was all it asked", () => {
    expect(
      new URLSearchParams(authorizeQuery(new URLSearchParams("prompt=login"))).has("prompt"),
    ).toBe(false);
  });
});

describe("where a login goes on to", () => {
  it("is a path on this site, Today otherwise", () => {
    expect(nextPath("/connect?client_id=c")).toBe("/connect?client_id=c");
    expect(nextPath("//evil.example")).toBe("/today");
    expect(nextPath("https://evil.example")).toBe("/today");
    expect(nextPath(null)).toBe("/today");
  });

  it("leaves the app for an assistant's sign-in only", () => {
    expect(leavesTheApp("/connect?client_id=c")).toBe(true);
    expect(leavesTheApp("/connected")).toBe(false);
    expect(leavesTheApp("/today")).toBe(false);
  });
});

describe("a span of days", () => {
  it("is the last two weeks by default", () => {
    expect(dayRange({}, "2026-11-27")).toEqual({ from: "2026-11-14", to: "2026-11-27" });
  });

  it("is at most nine weeks, and in order", () => {
    expect(() => dayRange({ from: "2026-01-01", to: "2026-11-27" }, "2026-11-27")).toThrow(
      ToolRefusal,
    );
    expect(() => dayRange({ from: "2026-11-28", to: "2026-11-27" }, "2026-11-27")).toThrow(
      ToolRefusal,
    );
    expect(dayRange({ from: "2026-09-26", to: "2026-11-27" }, "2026-11-27").from).toBe(
      "2026-09-26",
    );
  });
});

describe("the settings tab Din AI", () => {
  it("is a rider's, beside the devices, while the installation has MCP on", async () => {
    const { settingsItems } = await import("@/app/[locale]/(app)/(narrow)/settings/settings-items");
    const keys = (who: Parameters<typeof settingsItems>[0]) => settingsItems(who).map((i) => i.key);
    const rider = { owner: false, isCoach: false, isRider: true };
    expect(keys({ ...rider, mcp: true })).toEqual(
      expect.arrayContaining(["devices", "aiConnections"]),
    );
    expect(keys({ ...rider, mcp: false })).not.toContain("aiConnections");
    expect(keys({ owner: false, isCoach: true, isRider: false, mcp: true })).not.toContain(
      "aiConnections",
    );
  });
});
