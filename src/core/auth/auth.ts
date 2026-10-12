import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { organization, twoFactor } from "better-auth/plugins";
import { platformRoleForNewUser } from "@/core/access/service";
import {
  canCreatePersonalWorkspace,
  canCreateWorkspace,
  defaultWorkspaceId,
  markWorkspaceUsed,
} from "@/core/access/workspaces";
import { recordAuthEvent } from "@/core/audit/events";
import { authDb } from "@/core/db/client";
import * as schema from "@/core/db/schema";
import { env } from "@/core/env";
import { coachesTeam, COACH_ONLY_PATHS, trimForMember } from "./coach-only";
import { resetByMail, verificationByMail } from "./mail-hooks";
import { bodyNamesKind } from "./workspace-fields";
import {
  attemptFromRequest,
  countUsers,
  isDemoEmail,
  isSelfSignupRequest,
  signupAllowed,
} from "./signup";

const baseUrl = new URL(env.BETTER_AUTH_URL);

export { bodyNamesKind };

/** Open invitations a team may hold at once; "Inviter hele holdet" checks it before it starts. */
export const TEAM_INVITATION_LIMIT = 200;

/**
 * How long an invitation link works: a week, so a link a coach shares over
 * a weekend still works when a rider first opens it on the third day
 * (docs/adr/0064). Better Auth's default is 48 hours. The texts that say
 * until when read the date from the invitation itself.
 */
export const TEAM_INVITATION_DAYS = 7;

/** The organization plugin's endpoints that write a workspace's own row. */
const WORKSPACE_WRITE_PATHS = new Set(["/organization/create", "/organization/update"]);

export const auth = betterAuth({
  appName: "Kadence",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.AUTH_TRUSTED_ORIGINS,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(authDb, {
    provider: "pg",
    schema: {
      ...schema,
      // The adapter looks tables up by model name; alias the snake_case
      // model names to the camelCase schema exports.
      two_factors: schema.twoFactors,
      rate_limits: schema.rateLimits,
    },
  }),
  user: {
    modelName: "users",
    additionalFields: {
      // Role on the installation (see src/core/access). `input: false`
      // keeps it out of every request body: nobody registers as owner.
      platformRole: { type: "string", required: false, input: false },
      // Came in through door 2 (docs/adr/0088): confirms the address
      // before anything else, and goes after seven days unconfirmed. Set
      // at creation from door 2's key, never from a request body.
      selfSignup: { type: "boolean", required: false, input: false, defaultValue: false },
    },
  },
  session: {
    modelName: "sessions",
    // The session is read from a signed cookie for five minutes before the
    // database is asked again (docs/adr/0083): one query less on every
    // request. Signing out clears the cookie at once. Whether the person
    // is still on the team is not in the cookie: getOrgContext reads the
    // membership on every page (session.ts), so removal from a team takes
    // effect on the next page as before. What waits up to five minutes is
    // a session revoked elsewhere, such as the other devices signed out
    // when a coach's reset link is used.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: { modelName: "accounts" },
  // A link to confirm the address, asked for under Settings → Sikkerhed;
  // only when the installation sends mail (docs/adr/0086).
  ...verificationByMail(),
  verification: { modelName: "verifications" },
  emailAndPassword: {
    enabled: true,
    // OWASP ASVS: minimum 12 characters. A confirmed address is not
    // required to sign in (docs/adr/0086); a person who signs up alone
    // through door 2 is held at /verify until theirs is (verify-first.ts,
    // docs/adr/0088), signed in, so they can ask for the mail again.
    minPasswordLength: 12,
    requireEmailVerification: false,
    // A link a coach made (ADR 0032) is the way back in on every
    // installation: using it signs the person out everywhere else, and the
    // audit trail keeps that it was used. With mail (docs/adr/0086) the
    // person can ask for the same link by e-mail at /forgot-password;
    // without it there is no sendResetPassword, and Better Auth refuses.
    revokeSessionsOnPasswordReset: true,
    ...resetByMail(),
    onPasswordReset: async ({ user }) => {
      await recordAuthEvent({
        action: "auth.password_reset",
        actorUserId: user.id,
        orgId: await defaultWorkspaceId(user.id),
        entityType: "users",
        entityId: user.id,
      });
    },
  },
  rateLimit: {
    // On in every environment, stored in Postgres (no extra infrastructure).
    enabled: true,
    storage: "database",
    modelName: "rate_limits",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/reset-password": { window: 60, max: 10 },
      // The mail doors, for a caller that comes straight to Better Auth
      // rather than through /forgot-password (docs/adr/0086).
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/send-verification-email": { window: 60 * 60, max: 5 },
      "/sign-up/email": { window: 60, max: 10 },
      "/two-factor/verify-totp": { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // The first account on an empty installation owns it. Decided
        // here, at the moment of creation, so it holds for every path
        // that can create a user and not only for the registration form.
        before: async (user, context) => ({
          data: {
            ...user,
            platformRole: platformRoleForNewUser(await countUsers(), isDemoEmail(user.email)),
            selfSignup: isSelfSignupRequest(context?.headers, user.email),
          },
        }),
      },
    },
    session: {
      create: {
        before: async (session) => ({
          data: {
            ...session,
            activeOrganizationId: await defaultWorkspaceId(session.userId),
          },
        }),
        after: async (session) => {
          const { activeOrganizationId } = session as { activeOrganizationId?: string | null };
          await recordAuthEvent({
            action: "auth.login",
            actorUserId: session.userId,
            orgId: activeOrganizationId ?? null,
            entityType: "sessions",
            entityId: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          });
        },
      },
    },
  },
  hooks: {
    // The endpoint is the door, not the page. Hiding the registration form
    // closes the front door only; this closes the one that matters.
    before: createAuthMiddleware(async (ctx) => {
      // What a workspace is — a club, or one person's own training — is
      // ours to set, right after creation (docs/adr/0080). Better Auth
      // does not know the column and would drop it; refusing a body that
      // carries it keeps that true if a later version learns to pass it on.
      // The same goes for its plan and the plan's dates (docs/adr/0090).
      if (WORKSPACE_WRITE_PATHS.has(ctx.path) && bodyNamesKind(ctx.body)) {
        throw new APIError("BAD_REQUEST", {
          code: "WORKSPACE_KIND_NOT_SETTABLE",
          message: "A workspace's kind is not set from a request",
        });
      }
      // A workspace made on a person's behalf, with no session: Better
      // Auth's server-only path, which skips allowUserToCreateOrganization
      // and which a request can never take (a request without a session is
      // refused by the endpoint itself). Our server code takes it for one
      // thing, the personal workspace a rider leaving a team moves their
      // training into (docs/adr/0081), and a person gets one of those.
      if (ctx.path === "/organization/create") {
        const body = (ctx.body ?? {}) as { userId?: unknown };
        if (typeof body.userId === "string") {
          const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
          if (!session && !(await canCreatePersonalWorkspace(body.userId))) {
            throw new APIError("FORBIDDEN", {
              code: "PERSONAL_WORKSPACE_EXISTS",
              message: "A person has one personal workspace",
            });
          }
        }
      }
      if (ctx.path === "/sign-up/email") {
        if (!(await signupAllowed(attemptFromRequest(ctx.headers, ctx.body)))) {
          throw new APIError("FORBIDDEN", { code: "SIGNUP_CLOSED", message: "Sign-up is closed" });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // The club opened last is the one the next login opens (ADR 0048).
      // Before the coach-only trim below, which answers set-active itself.
      if (ctx.path === "/organization/set-active") {
        const returned = ctx.context.returned as { id?: unknown } | null | undefined;
        const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
        const orgId = returned && !(returned instanceof Error) ? returned.id : null;
        if (session && typeof orgId === "string") await markWorkspaceUsed(session.user.id, orgId);
      }
      // The team's invitations and addresses are the coaches' (coach-only.ts).
      if (COACH_ONLY_PATHS.has(ctx.path)) {
        const returned = ctx.context.returned;
        if (!returned || returned instanceof Error) return;
        const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
        if (!session) return;
        const orgId =
          (returned as { id?: unknown }).id ??
          (ctx.query as { organizationId?: unknown } | undefined)?.organizationId ??
          (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;
        if (typeof orgId === "string" && (await coachesTeam(session.user.id, orgId))) return;
        return ctx.json(
          trimForMember(ctx.path, returned, session.user.id) as Record<string, unknown>,
        );
      }
      if (ctx.path === "/sign-out") {
        const session = ctx.context.session;
        await recordAuthEvent({
          action: "auth.logout",
          actorUserId: session?.user.id ?? null,
          orgId: session?.session.activeOrganizationId ?? null,
          entityType: "sessions",
          entityId: session?.session.id ?? null,
        });
      }
    }),
  },
  plugins: [
    organization({
      // A team is deleted by delete_workspace, which takes the audit trail
      // with it (drizzle/0003); the plugin's own delete would leave the
      // riders' check-ins in the trail.
      disableOrganizationDeletion: true,
      // A new club comes in through the owner's approval (ADR 0048).
      allowUserToCreateOrganization: async (user) => canCreateWorkspace(user.id),
      // A club with forty riders, their parents and the coaches is past
      // Better Auth's default of 100 members.
      membershipLimit: 500,
      invitationLimit: TEAM_INVITATION_LIMIT,
      // In seconds; a new link and a renewed one alike.
      invitationExpiresIn: TEAM_INVITATION_DAYS * 24 * 60 * 60,
      schema: {
        organization: { modelName: "organizations" },
        member: { modelName: "memberships" },
        invitation: { modelName: "invitations" },
      },
    }),
    passkey({
      rpID: baseUrl.hostname,
      rpName: "Kadence",
      origin: env.BETTER_AUTH_URL,
      schema: {
        passkey: { modelName: "passkeys" },
      },
    }),
    twoFactor({
      issuer: "Kadence",
      schema: {
        twoFactor: { modelName: "two_factors" },
      },
    }),
    // Must stay last: makes Better Auth set cookies from server actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
