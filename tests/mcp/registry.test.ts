import { describe, expect, it } from "vitest";
import { MCP_SCOPES } from "@/core/auth/mcp";
import { descriptor, INSTRUCTIONS, toolsFor } from "@/modules/mcp/server";
import { DEFAULT_PERMISSIONS, PERMISSIONS } from "@/modules/mcp/permissions";
import { TOOLS } from "@/modules/mcp/tools";

/**
 * The tools an assistant may call (docs/plan-mcp.md §4). The list of tools
 * that write is named here, so a tool that changes anything is added to it
 * on purpose; each sits behind a switch the person turns on, and none is
 * on for a new connection (docs/adr/0120).
 */

const WRITES = [
  "save_my_checkin",
  "rate_my_ride",
  "move_my_session",
  "skip_my_session",
  "unskip_my_session",
  "add_my_session",
  "update_my_session",
  "delete_my_session",
  "delete_my_manual_activity",
  "delete_my_ride",
  "delete_my_checkin",
];

describe("the register", () => {
  it("names every tool once", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("writes only through the tools named here", () => {
    expect(TOOLS.filter((t) => !t.readOnly).map((t) => t.name)).toEqual(WRITES);
  });

  it("asks for a scope Kadence has, as a rider about themselves", () => {
    for (const tool of TOOLS) {
      expect(MCP_SCOPES).toContain(tool.scope);
      expect(tool.role).toBe("rider");
    }
  });

  it("describes each tool as an object schema, destructive only where it writes, never the open world", () => {
    for (const tool of TOOLS) {
      const d = descriptor(tool);
      expect(d.inputSchema.type).toBe("object");
      expect(d.inputSchema.$schema).toBeUndefined();
      if (tool.readOnly) expect(d.annotations.destructiveHint).toBe(false);
      if (tool.name.startsWith("delete_")) expect(d.annotations.destructiveHint).toBe(true);
      expect(d.annotations.openWorldHint).toBe(false);
      expect(d.description.length).toBeGreaterThan(20);
    }
  });

  it("reaches no tool without a scope, and only the tools the person switched on", () => {
    expect(toolsFor([], [...PERMISSIONS])).toEqual([]);
    expect(toolsFor(["kadence:read"], [...PERMISSIONS]).length).toBe(TOOLS.length);
    const fresh = toolsFor(["kadence:read"], DEFAULT_PERMISSIONS).map((t) => t.name);
    for (const name of WRITES) expect(fresh).not.toContain(name);
    expect(toolsFor(["kadence:read"], ["delete_rides"]).map((t) => t.name)).toEqual([
      "delete_my_ride",
    ]);
  });

  it("uses none of TrainingPeaks' words", () => {
    const words = [INSTRUCTIONS, ...TOOLS.map((t) => `${t.title} ${t.description}`)];
    for (const text of words) expect(text).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
  });
});
