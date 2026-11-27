import { env } from "@/core/env";
import { errorName, log } from "@/core/log";
import { admit } from "./admit";
import { ERR, respond } from "./protocol";
import { serverFor } from "./server";

/** A message is small: a tool's name and a few arguments. */
const MAX_BODY_BYTES = 64 * 1024;

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * One request to /api/mcp: the browser's origin checked (MCP requires it,
 * against DNS rebinding), the caller admitted, the message read, capped
 * and answered. An error inside a tool is logged without its content and
 * answered as JSON-RPC's internal error, never as a stack.
 */
export async function handleMcp(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(env.BETTER_AUTH_URL).origin)
    return new Response(null, { status: 403 });

  const admitted = await admit(request);
  if (admitted instanceof Response) return admitted;

  const tooLarge = () =>
    json(413, {
      jsonrpc: "2.0",
      id: null,
      error: { code: ERR.invalidRequest, message: "Too large" },
    });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge();
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return tooLarge();
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return json(400, {
      jsonrpc: "2.0",
      id: null,
      error: { code: ERR.parse, message: "Parse error" },
    });
  }

  try {
    const reply = await respond(
      request.headers,
      message,
      serverFor(admitted.caller, admitted.scopes),
    );
    if (reply.body === null) return new Response(null, { status: reply.status });
    return json(reply.status, reply.body);
  } catch (error) {
    await log.error("mcp: call failed", {
      orgId: admitted.caller.ctx.orgId,
      error: errorName(error),
    });
    const id = (message as { id?: unknown } | null)?.id;
    return json(500, {
      jsonrpc: "2.0",
      id: typeof id === "string" || typeof id === "number" ? id : null,
      error: { code: ERR.internal, message: "Internal error" },
    });
  }
}
