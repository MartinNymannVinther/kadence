/**
 * The part of MCP Kadence speaks (docs/adr/0118): JSON-RPC 2.0 over one
 * POST, answered as `application/json`, tools only, no sessions. Two eras
 * on one address, as the specification allows
 * (https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning):
 *
 * - **2026-07-28**: every request names its version in
 *   `_meta["io.modelcontextprotocol/protocolVersion"]` and in the
 *   `MCP-Protocol-Version` header, the method in `Mcp-Method`, and a tool's
 *   name in `Mcp-Name`; `server/discover` instead of a handshake; results
 *   carry `resultType`, and `tools/list` its `ttlMs` and `cacheScope`.
 * - **2025-11-25 and before**: `initialize`, `notifications/initialized`
 *   and `ping`, which Le Chat still sends.
 *
 * Pure: who the caller is and what a tool does are handed in.
 */

export const MODERN = "2026-07-28";
export const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const SUPPORTED = [MODERN, ...LEGACY];

const VERSION_META = "io.modelcontextprotocol/protocolVersion";
const SERVER_INFO_META = "io.modelcontextprotocol/serverInfo";

/** JSON-RPC and MCP error codes, from the specification's schema. */
export const ERR = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  headerMismatch: -32020,
  unsupportedVersion: -32022,
} as const;

export type ToolDescriptor = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
};

/** What a tool call came to: data, words for the model, or no such tool. */
export type CallOutcome =
  { kind: "data"; data: unknown } | { kind: "refused"; words: string } | { kind: "unknownTool" };

export type Server = {
  name: string;
  version: string;
  instructions: string;
  tools: ToolDescriptor[];
  call: (name: string, args: unknown) => Promise<CallOutcome>;
};

/** What the route sends: a status and a JSON body, or no body (a notification taken). */
export type Reply = { status: number; body: unknown };

type Message = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const validId = (id: unknown): id is string | number =>
  typeof id === "string" || (typeof id === "number" && Number.isFinite(id));

function error(status: number, id: unknown, code: number, message: string, data?: unknown): Reply {
  return {
    status,
    body: {
      jsonrpc: "2.0",
      id: validId(id) ? id : null,
      error: data === undefined ? { code, message } : { code, message, data },
    },
  };
}

function result(id: string | number, value: Record<string, unknown>, modern: boolean): Reply {
  return {
    status: 200,
    body: { jsonrpc: "2.0", id, result: modern ? { resultType: "complete", ...value } : value },
  };
}

/** The version a modern request names, or null for a request of the earlier era. */
function modernVersion(params: unknown): string | null {
  if (!isObject(params) || !isObject(params._meta)) return null;
  const v = params._meta[VERSION_META];
  return typeof v === "string" ? v : null;
}

/**
 * The headers a modern request must carry, each the same as the body
 * (https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).
 * Returns what is wrong, or null.
 */
function headerMismatch(
  headers: Headers,
  method: string,
  version: string,
  params: unknown,
): string | null {
  if (headers.get("mcp-protocol-version") !== version)
    return "MCP-Protocol-Version header does not match the body";
  if (headers.get("mcp-method") !== method) return "Mcp-Method header does not match the body";
  if (method === "tools/call") {
    const name = isObject(params) ? params.name : undefined;
    if (headers.get("mcp-name") !== name) return "Mcp-Name header does not match the body";
  }
  return null;
}

function listTools(server: Server) {
  return {
    tools: server.tools.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { title: t.title, ...t.annotations },
    })),
  };
}

async function callTool(server: Server, id: string | number, params: unknown, modern: boolean) {
  const name = isObject(params) ? params.name : undefined;
  const status = modern ? 400 : 200;
  if (typeof name !== "string")
    return error(status, id, ERR.invalidParams, "params.name is required");
  const args = isObject(params) && params.arguments !== undefined ? params.arguments : {};
  const outcome = await server.call(name, args);
  if (outcome.kind === "unknownTool")
    return error(status, id, ERR.invalidParams, `Unknown tool: ${name}`);
  if (outcome.kind === "refused")
    return result(id, { content: [{ type: "text", text: outcome.words }], isError: true }, modern);
  return result(
    id,
    {
      content: [{ type: "text", text: JSON.stringify(outcome.data) }],
      structuredContent: outcome.data,
    },
    modern,
  );
}

/** One JSON-RPC message in, one reply out. */
export async function respond(headers: Headers, message: unknown, server: Server): Promise<Reply> {
  if (Array.isArray(message))
    return error(400, null, ERR.invalidRequest, "Batches are not supported");
  if (!isObject(message)) return error(400, null, ERR.invalidRequest, "Not a JSON-RPC message");
  const { id, method, params } = message as Message;
  if (message.jsonrpc !== "2.0" || typeof method !== "string")
    return error(400, id, ERR.invalidRequest, "Not a JSON-RPC 2.0 request");

  // A notification: taken, nothing to answer.
  if (id === undefined) return { status: 202, body: null };
  if (!validId(id)) return error(400, null, ERR.invalidRequest, "Invalid id");

  const version = modernVersion(params);
  const modern = version !== null;
  if (modern) {
    if (version !== MODERN)
      return error(400, id, ERR.unsupportedVersion, "Unsupported protocol version", {
        supported: SUPPORTED,
        requested: version,
      });
    const mismatch = headerMismatch(headers, method, version, params);
    if (mismatch) return error(400, id, ERR.headerMismatch, `Header mismatch: ${mismatch}`);
  }

  switch (method) {
    case "initialize": {
      const asked = isObject(params) ? params.protocolVersion : undefined;
      const protocolVersion =
        typeof asked === "string" && (LEGACY as readonly string[]).includes(asked)
          ? asked
          : LEGACY[0];
      return result(
        id,
        {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: server.name, version: server.version },
          instructions: server.instructions,
        },
        false,
      );
    }
    case "server/discover":
      return result(
        id,
        {
          supportedVersions: SUPPORTED,
          capabilities: { tools: { listChanged: false } },
          instructions: server.instructions,
          ttlMs: 0,
          cacheScope: "private",
          _meta: { [SERVER_INFO_META]: { name: server.name, version: server.version } },
        },
        true,
      );
    case "ping":
      return result(id, {}, modern);
    case "tools/list":
      return result(
        id,
        modern ? { ...listTools(server), ttlMs: 0, cacheScope: "private" } : listTools(server),
        modern,
      );
    case "tools/call":
      return callTool(server, id, params, modern);
    default:
      return error(modern ? 404 : 200, id, ERR.methodNotFound, `Method not found: ${method}`);
  }
}
