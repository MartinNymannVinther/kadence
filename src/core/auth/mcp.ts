import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { env } from "@/core/env";
import { featureOn } from "@/core/features";

/**
 * The sign-in a person's own assistant goes through to reach /api/mcp
 * (docs/adr/0118): Better Auth's OAuth 2.1 server for MCP, with Client ID
 * Metadata Documents for Claude and ChatGPT and open dynamic registration
 * for Le Chat, which supports nothing else. A client can do nothing until
 * a person says yes on the consent page, and the yes is for one
 * workspace: the one active in the person's session when they say it.
 *
 * Nothing here is registered when the installation has `MCP=off`, or when
 * Kadence runs on a plain-http name other than localhost, where OAuth for
 * MCP is not allowed: the endpoints then answer 404 like any unknown path.
 */

/** What an assistant may ask for. Checking in and drafts come with the next waves (docs/plan-mcp.md §8). */
export const MCP_SCOPES = ["kadence:read"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** The claim on an access token that names the workspace the yes was given for. */
export const ORG_CLAIM = "kadence_org";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** /api/mcp as an absolute address, or null where MCP's OAuth cannot run. */
export function mcpResourceFrom(baseUrl: string): string | null {
  const url = new URL("/api/mcp", baseUrl);
  if (url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK.has(url.hostname)))
    return url.toString();
  return null;
}

export const MCP_RESOURCE = mcpResourceFrom(env.BETTER_AUTH_URL);

/** Who signs the access tokens: Better Auth at its base path, as its discovery document says. */
export const AUTH_ISSUER = new URL("/api/auth", env.BETTER_AUTH_URL).toString();

/** Whether this installation lets assistants connect at all. */
export function mcpOn(): boolean {
  return MCP_RESOURCE !== null && featureOn("aiConnections");
}

/** Better Auth's names for the tables, mapped to Kadence's (src/core/db/schema/oauth.ts). */
const OAUTH_TABLES = {
  oauthClient: { modelName: "oauth_clients" },
  oauthResource: { modelName: "oauth_resources" },
  oauthClientResource: { modelName: "oauth_client_resources" },
  oauthRefreshToken: { modelName: "oauth_refresh_tokens" },
  oauthAccessToken: { modelName: "oauth_access_tokens" },
  oauthConsent: { modelName: "oauth_consents" },
  oauthClientAssertion: { modelName: "oauth_client_assertions" },
};

export function mcpPlugins() {
  if (!mcpOn() || !MCP_RESOURCE) return [];
  return [
    jwt({
      // The plugin would also hand a session's JWT to every page that asks
      // for the session; Kadence signs access tokens with it and nothing else.
      disableSettingJwtHeader: true,
      jwt: { issuer: AUTH_ISSUER },
      schema: { jwks: { modelName: "jwks" } },
    }),
    mcp({
      resource: MCP_RESOURCE,
      loginPage: "/connect",
      consentPage: "/connect/consent",
      scopes: ["offline_access", ...MCP_SCOPES],
      // The yes is for the workspace active in the session when it is given;
      // the consent page lets the person choose it first. No session
      // without one gets this far: Kadence's own pages require a workspace.
      postLogin: {
        page: "/connect/consent",
        shouldRedirect: () => false,
        consentReferenceId: ({ session }) => {
          const orgId = (session as { activeOrganizationId?: string | null }).activeOrganizationId;
          if (!orgId) throw new APIError("FORBIDDEN", { message: "No workspace" });
          return orgId;
        },
      },
      customAccessTokenClaims: ({ referenceId }) =>
        referenceId ? { [ORG_CLAIM]: referenceId } : {},
      // A person signs in and an assistant renews; no client acts on its own.
      grantTypes: ["authorization_code", "refresh_token"],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationRequirePKCE: true,
      clientRegistrationDefaultScopes: ["offline_access", ...MCP_SCOPES],
      clientRegistrationAllowedScopes: ["offline_access", ...MCP_SCOPES],
      // An hour for an access token, thirty days for the refresh token
      // that renews it; removing the connection on "Din AI" ends both.
      accessTokenExpiresIn: 60 * 60,
      refreshTokenExpiresIn: 30 * 24 * 60 * 60,
      schema: OAUTH_TABLES,
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
  ];
}

/**
 * The endpoints of the jwt plugin that sign a session into a token. Kadence
 * signs access tokens for assistants only; a session's own JWT is refused.
 */
export const REFUSED_JWT_PATHS = new Set(["/token"]);

/** The adapter's lookup of the OAuth tables by model name (auth.ts). */
export function oauthSchemaAliases<T extends Record<string, unknown>>(schema: T) {
  return {
    oauth_clients: schema.oauthClients,
    oauth_resources: schema.oauthResources,
    oauth_client_resources: schema.oauthClientResources,
    oauth_refresh_tokens: schema.oauthRefreshTokens,
    oauth_access_tokens: schema.oauthAccessTokens,
    oauth_consents: schema.oauthConsents,
    oauth_client_assertions: schema.oauthClientAssertions,
  };
}
