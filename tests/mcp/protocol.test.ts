import { describe, expect, it } from "vitest";
import { ERR, MODERN, respond, type Server } from "@/modules/mcp/protocol";

/**
 * MCP as Kadence speaks it (src/modules/mcp/protocol.ts, docs/adr/0118):
 * both eras on one address, the headers a modern request must carry, and
 * every way a message can be wrong answered as JSON-RPC, never thrown.
 */

const server: Server = {
  name: "kadence",
  version: "0.9.0",
  instructions: "Use Kadence's words.",
  tools: [
    {
      name: "get_today",
      title: "Today",
      description: "The day.",
      inputSchema: { type: "object" },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
  ],
  call: async (name) => {
    if (name === "get_today") return { kind: "data", data: { today: "2026-11-27" } };
    if (name === "refuse") return { kind: "refused", words: "No." };
    return { kind: "unknownTool" };
  },
};

const meta = { _meta: { "io.modelcontextprotocol/protocolVersion": MODERN } };
const modernHeaders = (method: string, name?: string) =>
  new Headers({
    "MCP-Protocol-Version": MODERN,
    "Mcp-Method": method,
    ...(name ? { "Mcp-Name": name } : {}),
  });
const none = new Headers();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a JSON-RPC reply read in assertions
const body = (reply: { body: unknown }) => reply.body as Record<string, any>;

describe("the earlier era", () => {
  it("answers initialize with the version asked for, when Kadence speaks it", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      server,
    );
    expect(reply.status).toBe(200);
    expect(body(reply).result.protocolVersion).toBe("2025-06-18");
    expect(body(reply).result.serverInfo.name).toBe("kadence");
    expect(body(reply).result.instructions).toBe("Use Kadence's words.");
  });

  it("offers its newest earlier version to an unknown one", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-01-01" } },
      server,
    );
    expect(body(reply).result.protocolVersion).toBe("2025-11-25");
  });

  it("takes a notification with 202 and no body", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", method: "notifications/initialized" },
      server,
    );
    expect(reply).toEqual({ status: 202, body: null });
  });

  it("lists and calls tools without resultType", async () => {
    const list = await respond(none, { jsonrpc: "2.0", id: 2, method: "tools/list" }, server);
    expect(body(list).result.tools.map((t: { name: string }) => t.name)).toEqual(["get_today"]);
    expect(body(list).result.resultType).toBeUndefined();
    const call = await respond(
      none,
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_today" } },
      server,
    );
    expect(body(call).result.structuredContent).toEqual({ today: "2026-11-27" });
    expect(JSON.parse(body(call).result.content[0].text)).toEqual({ today: "2026-11-27" });
  });
});

describe("2026-07-28", () => {
  it("discovers the server with its versions, ttl and cache scope", async () => {
    const reply = await respond(
      modernHeaders("server/discover"),
      { jsonrpc: "2.0", id: 1, method: "server/discover", params: meta },
      server,
    );
    const result = body(reply).result;
    expect(result.resultType).toBe("complete");
    expect(result.supportedVersions).toContain(MODERN);
    expect(result.ttlMs).toBe(0);
    expect(result.cacheScope).toBe("private");
    expect(result._meta["io.modelcontextprotocol/serverInfo"].name).toBe("kadence");
  });

  it("carries resultType, ttlMs and cacheScope on tools/list", async () => {
    const reply = await respond(
      modernHeaders("tools/list"),
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: meta },
      server,
    );
    expect(body(reply).result).toMatchObject({ resultType: "complete", ttlMs: 0 });
  });

  it("refuses a header that does not match the body", async () => {
    const reply = await respond(
      modernHeaders("tools/call", "other"),
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { ...meta, name: "get_today" } },
      server,
    );
    expect(reply.status).toBe(400);
    expect(body(reply).error.code).toBe(ERR.headerMismatch);
  });

  it("refuses a missing header", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: meta },
      server,
    );
    expect(body(reply).error.code).toBe(ERR.headerMismatch);
  });

  it("names the versions it speaks when asked for one it does not", async () => {
    const reply = await respond(
      modernHeaders("tools/list"),
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: { _meta: { "io.modelcontextprotocol/protocolVersion": "1900-01-01" } },
      },
      server,
    );
    expect(reply.status).toBe(400);
    expect(body(reply).error.code).toBe(ERR.unsupportedVersion);
    expect(body(reply).error.data.requested).toBe("1900-01-01");
  });

  it("answers an unknown method with 404", async () => {
    const reply = await respond(
      modernHeaders("resources/list"),
      { jsonrpc: "2.0", id: 1, method: "resources/list", params: meta },
      server,
    );
    expect(reply.status).toBe(404);
    expect(body(reply).error.code).toBe(ERR.methodNotFound);
  });
});

describe("a message that is wrong", () => {
  it("is a batch, which is refused", async () => {
    expect(body(await respond(none, [], server)).error.code).toBe(ERR.invalidRequest);
  });

  it("is not JSON-RPC 2.0", async () => {
    const reply = await respond(none, { id: 1, method: "ping" }, server);
    expect(body(reply).error.code).toBe(ERR.invalidRequest);
  });

  it("names an unknown tool, which is invalid params", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "delete_all" } },
      server,
    );
    expect(body(reply).error.code).toBe(ERR.invalidParams);
  });

  it("is refused by the tool, which tells the model in words", async () => {
    const reply = await respond(
      none,
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "refuse" } },
      server,
    );
    expect(body(reply).result).toEqual({ content: [{ type: "text", text: "No." }], isError: true });
  });
});
