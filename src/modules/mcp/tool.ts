import type { z } from "zod";
import type { OrgContext } from "@/core/db/tenant";
import type { McpScope } from "@/core/auth/mcp";
import type { Permission } from "./permissions";

/**
 * One tool an assistant may call (docs/adr/0118, docs/plan-mcp.md §4): its
 * name and words for the model, its input as zod and as JSON Schema, the
 * scope and role it needs, MCP's hints, and what it runs. Every tool runs
 * the ordinary services with the caller's `OrgContext`, so RLS, the role
 * checks and the separation between riders hold exactly as in the app.
 * A tool file holds one tool; the register (./tools/index.ts) lists them.
 */

/** What a call knows about its caller, settled before any tool runs (./admit.ts). */
export type Caller = {
  ctx: OrgContext;
  /** The caller's own rider in the workspace: every rider tool is about them. */
  riderId: string;
  /** Today in Copenhagen, ISO. */
  today: string;
  /** The connection the call came through, for the undo log. */
  connectionId: string | null;
  /** What the person lets this assistant do (./permissions.ts). */
  permissions: readonly Permission[];
};

export type Tool<S extends z.ZodType = z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: S;
  scope: McpScope;
  /** The person's switch the tool needs (docs/adr/0120); without it the tool is not offered. */
  permission: Permission;
  /** Only rider tools exist in the first wave; coach tools come in the second. */
  role: "rider";
  /** Whether the tool only reads. Writes are named in tests/mcp/registry.test.ts. */
  readOnly: boolean;
  /** Whether it changes or removes what is there; the assistant's maker may ask the person first. */
  destructive?: boolean;
  run: (caller: Caller, input: z.infer<S>) => Promise<unknown>;
};

/** A refusal a tool answers with: said to the assistant in words, as a tool error. */
export class ToolRefusal extends Error {
  constructor(readonly words: string) {
    super(words);
    this.name = "ToolRefusal";
  }
}

export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool<S> {
  return tool;
}
