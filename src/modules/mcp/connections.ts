import { and, eq, isNull, lt, or } from "drizzle-orm";
import { authDb } from "@/core/db/client";
import {
  aiConnections,
  oauthAccessTokens,
  oauthClients,
  oauthConsents,
  oauthRefreshTokens,
} from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { MCP_SCOPES, type McpScope } from "@/core/auth/mcp";

/**
 * A person's connections to their own assistants (docs/adr/0118): made on
 * the yes, read on every call to /api/mcp, listed and removed on "Din AI".
 * The rows are the person's own under the database's policies
 * (drizzle/0063). Better Auth's consent and tokens are on the auth role;
 * removing a connection takes them too, so the assistant has to ask again.
 */

export type ConnectionView = {
  id: string;
  clientName: string;
  clientHost: string;
  scopes: McpScope[];
  createdAt: Date;
  lastUsedAt: Date | null;
};

const NAME_CHARS = 80;
/** How often a call writes `last_used_at`: once a minute is enough to say "brugt i dag". */
const TOUCH_MS = 60_000;

const isScope = (s: string): s is McpScope => (MCP_SCOPES as readonly string[]).includes(s);

/** The client as the person is shown it: its own name, capped, and where it returns to. */
export async function describeClient(
  clientId: string,
  redirectUri: string | null,
): Promise<{ name: string; host: string } | null> {
  const [client] = await authDb
    .select({ name: oauthClients.name, redirectUris: oauthClients.redirectUris })
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId));
  if (!client) return null;
  const uri =
    redirectUri && client.redirectUris.includes(redirectUri)
      ? redirectUri
      : (client.redirectUris[0] ?? "");
  let host = "";
  try {
    host = new URL(uri).host;
  } catch {
    host = "";
  }
  const name = (client.name ?? "").replace(/\s+/g, " ").trim().slice(0, NAME_CHARS);
  return { name: name || host || "?", host: host || "?" };
}

/** The yes, as a row: made once, its scopes replaced when the person says yes again. */
export async function recordConnection(
  ctx: OrgContext,
  input: { clientId: string; clientName: string; clientHost: string; scopes: string[] },
): Promise<void> {
  const scopes = input.scopes.filter(isScope);
  await withOrgContext(ctx, async (tx) => {
    await tx
      .insert(aiConnections)
      .values({
        orgId: ctx.orgId,
        userId: ctx.userId,
        clientId: input.clientId,
        clientName: input.clientName.slice(0, NAME_CHARS),
        clientHost: input.clientHost.slice(0, 255),
        scopes,
      })
      .onConflictDoUpdate({
        target: [aiConnections.orgId, aiConnections.userId, aiConnections.clientId],
        set: { scopes, clientName: input.clientName.slice(0, NAME_CHARS) },
      });
  });
}

export async function listConnections(ctx: OrgContext): Promise<ConnectionView[]> {
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(aiConnections)
      .where(and(eq(aiConnections.orgId, ctx.orgId), eq(aiConnections.userId, ctx.userId)))
      .orderBy(aiConnections.createdAt),
  );
  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientHost: r.clientHost,
    scopes: r.scopes.filter(isScope),
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

/**
 * The connection a call comes through, or null: the one thing that makes a
 * valid token reach anything. Notes the use at most once a minute.
 */
export async function connectionFor(
  ctx: OrgContext,
  clientId: string,
): Promise<{ id: string; scopes: McpScope[] } | null> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: aiConnections.id, scopes: aiConnections.scopes })
      .from(aiConnections)
      .where(and(eq(aiConnections.clientId, clientId), eq(aiConnections.userId, ctx.userId)));
    if (!row) return null;
    const now = new Date();
    await tx
      .update(aiConnections)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(aiConnections.id, row.id),
          or(
            isNull(aiConnections.lastUsedAt),
            lt(aiConnections.lastUsedAt, new Date(now.getTime() - TOUCH_MS)),
          ),
        ),
      );
    return { id: row.id, scopes: row.scopes.filter(isScope) };
  });
}

/**
 * Removes the connection, and with it Better Auth's consent for this
 * workspace and every token the assistant holds for it. The row goes
 * first: from that moment /api/mcp answers the assistant with 401.
 */
export async function removeConnection(ctx: OrgContext, id: string): Promise<boolean> {
  const [gone] = await withOrgContext(ctx, (tx) =>
    tx
      .delete(aiConnections)
      .where(and(eq(aiConnections.id, id), eq(aiConnections.userId, ctx.userId)))
      .returning({ clientId: aiConnections.clientId }),
  );
  if (!gone) return false;
  const now = new Date();
  const ofThis = (t: typeof oauthConsents | typeof oauthRefreshTokens | typeof oauthAccessTokens) =>
    and(eq(t.clientId, gone.clientId), eq(t.userId, ctx.userId), eq(t.referenceId, ctx.orgId));
  await authDb.delete(oauthConsents).where(ofThis(oauthConsents));
  await authDb.update(oauthRefreshTokens).set({ revoked: now }).where(ofThis(oauthRefreshTokens));
  await authDb.update(oauthAccessTokens).set({ revoked: now }).where(ofThis(oauthAccessTokens));
  return true;
}
