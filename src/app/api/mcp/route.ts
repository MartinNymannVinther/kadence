import { handleMcp } from "@/modules/mcp/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A person's own assistant talking to Kadence (docs/adr/0118): MCP over one
 * POST, stateless, answered as JSON (src/modules/mcp).
 */
export async function POST(request: Request) {
  return handleMcp(request);
}

/** No stream to open and no session to end: MCP's GET and DELETE are 405 here. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
