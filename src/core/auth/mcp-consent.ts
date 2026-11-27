import { APIError, getSessionFromCtx } from "better-auth/api";
import type { GenericEndpointContext } from "@better-auth/core";
import { todayInCopenhagen } from "@/core/dates";
import { log, errorName } from "@/core/log";
import { describeClient, recordConnection } from "@/modules/mcp/connections";
import { connectingRider } from "@/modules/mcp/eligibility";
import { MCP_SCOPES } from "./mcp";
import { stillAMember } from "./session";
import { mustVerifyFirst } from "./verify-first";

/**
 * The yes on the consent page (docs/adr/0118), seen from Better Auth's side.
 * Before: the same rule the page shows is checked again where it counts,
 * so a request made without the page is refused the same way. After: the
 * yes becomes the person's connection, which /api/mcp asks on every call.
 */

type ConsentBody = { accept?: unknown; scope?: unknown; oauth_query?: unknown };

const thisYear = () => Number(todayInCopenhagen().slice(0, 4));

async function who(ctx: GenericEndpointContext) {
  const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
  if (!session || (await mustVerifyFirst(session.user))) return null;
  const orgId = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;
  if (!orgId || !(await stillAMember(session.user.id, orgId))) return null;
  return { orgId, userId: session.user.id };
}

export async function beforeConsent(ctx: GenericEndpointContext): Promise<void> {
  const body = (ctx.body ?? {}) as ConsentBody;
  if (body.accept !== true) return;
  const caller = await who(ctx);
  if (!caller) throw new APIError("FORBIDDEN", { code: "NOT_A_MEMBER", message: "No workspace" });
  const rider = await connectingRider(caller, thisYear());
  if ("refused" in rider)
    throw new APIError("FORBIDDEN", { code: rider.refused, message: "May not connect" });
}

export async function afterConsent(ctx: GenericEndpointContext): Promise<void> {
  const body = (ctx.body ?? {}) as ConsentBody;
  const returned = (ctx.context as { returned?: unknown }).returned;
  if (body.accept !== true || !returned || returned instanceof Error) return;
  if (typeof body.oauth_query !== "string") return;
  const caller = await who(ctx);
  if (!caller) return;
  const query = new URLSearchParams(body.oauth_query);
  const clientId = query.get("client_id");
  if (!clientId) return;
  const scopes = (typeof body.scope === "string" ? body.scope : (query.get("scope") ?? ""))
    .split(" ")
    .filter((s) => (MCP_SCOPES as readonly string[]).includes(s));
  try {
    const client = await describeClient(clientId, query.get("redirect_uri"));
    if (!client) return;
    await recordConnection(caller, {
      clientId,
      clientName: client.name,
      clientHost: client.host,
      scopes,
    });
  } catch (error) {
    // The code is already on its way to the assistant; without the row its
    // first call is answered 401, and the person is asked again.
    await log.error("mcp: connection not recorded", { error: errorName(error) });
  }
}
