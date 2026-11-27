import { describe, expect, it } from "vitest";
import { MCP_SCOPES } from "@/core/auth/mcp";
import { descriptor, INSTRUCTIONS, toolsFor } from "@/modules/mcp/server";
import { TOOLS } from "@/modules/mcp/tools";

/**
 * The tools an assistant may call (docs/plan-mcp.md §4). The list of tools
 * that write is named here: in the first wave it is empty, and a tool that
 * changes anything has to be added to it on purpose.
 */

const WRITES: string[] = [];

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

  it("describes each tool as an object schema, never destructive, never the open world", () => {
    for (const tool of TOOLS) {
      const d = descriptor(tool);
      expect(d.inputSchema.type).toBe("object");
      expect(d.inputSchema.$schema).toBeUndefined();
      expect(d.annotations.destructiveHint).toBe(false);
      expect(d.annotations.openWorldHint).toBe(false);
      expect(d.description.length).toBeGreaterThan(20);
    }
  });

  it("reaches no tool without a scope", () => {
    expect(toolsFor([])).toEqual([]);
    expect(toolsFor(["kadence:read"]).length).toBe(TOOLS.length);
  });

  it("uses none of TrainingPeaks' words", () => {
    const words = [INSTRUCTIONS, ...TOOLS.map((t) => `${t.title} ${t.description}`)];
    for (const text of words) expect(text).not.toMatch(/\b(TSS|CTL|ATL|TSB|NP|IF)\b/);
  });
});
