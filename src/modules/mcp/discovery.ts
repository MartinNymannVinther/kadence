import { auth } from "@/core/auth/auth";
import { MCP_RESOURCE, mcpOn } from "@/core/auth/mcp";

/**
 * The two discovery documents an assistant reads before it signs in
 * (docs/adr/0118): where the authorization server is (RFC 9728) and what
 * it offers (RFC 8414). Better Auth's MCP plugin writes both; these routes
 * only bring the addresses clients look at, at the root of the site, to
 * the path Better Auth answers. With MCP off they are 404 like any page
 * that is not there.
 */

const AUTH_BASE = "/api/auth";

function notFound(): Response {
  return new Response(null, { status: 404 });
}

async function forward(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  return auth.handler(new Request(url, { method: request.method, headers: request.headers }));
}

/** `/.well-known/oauth-authorization-server`, bare or with the issuer's path `/api/auth`. */
export async function authorizationServerMetadata(
  request: Request,
  rest: string[] | undefined,
): Promise<Response> {
  const tail = (rest ?? []).join("/");
  if (!mcpOn() || (tail !== "" && `/${tail}` !== AUTH_BASE)) return notFound();
  return forward(request, `/.well-known/oauth-authorization-server${AUTH_BASE}`);
}

/** `/.well-known/oauth-protected-resource`, bare or with the resource's path `/api/mcp`. */
export async function protectedResourceMetadata(
  request: Request,
  rest: string[] | undefined,
): Promise<Response> {
  const tail = (rest ?? []).join("/");
  if (!mcpOn() || !MCP_RESOURCE) return notFound();
  const resourcePath = new URL(MCP_RESOURCE).pathname;
  if (tail !== "" && `/${tail}` !== resourcePath) return notFound();
  return forward(request, `/.well-known/oauth-protected-resource${resourcePath}`);
}
