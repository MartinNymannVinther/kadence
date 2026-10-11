import { APIError } from "better-auth";
import { z } from "zod";
import { personalProblem, type PersonalSpec } from "@/core/access/personal";
import { consumeInvitation, findValidInvitation } from "@/core/access/service";
import { todayInCopenhagen } from "@/core/dates";
import { errorName, log, requestIdFrom } from "@/core/log";
import { organizationSlug } from "@/lib/slug";
import { auth } from "./auth";
import { setUpPersonalWorkspace } from "./register-personal";
import { DEMO_HEADER, INVITATION_HEADER, signupAllowed, TEAM_INVITATION_HEADER } from "./signup";

export const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  password: z.string().min(12).max(128),
  organizationName: z.string().trim().min(1).max(200),
  /** Key from an invitation link; the only way in while signup is closed. */
  invitationToken: z.string().min(1).max(200).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export type RegisterResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "emailExists" | "closed" | "invitationInvalid" | "tooYoung" | "generic";
    };

/** Turns the set-cookie headers of an API response into a cookie header. */
function cookieHeaderFrom(responseHeaders: Headers): Headers {
  const cookie = responseHeaders
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
  return new Headers({ cookie });
}

/**
 * Registration: creates the user, signs them in, creates their organization
 * and makes it the active one. One function so the "signup creates a user
 * and their organization" invariant lives in a single place. Framework-free
 * so the flow is testable outside Next.js.
 */
export async function registerUserWithOrganization(
  requestHeaders: Headers,
  input: unknown,
): Promise<RegisterResult> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  const { name, password, invitationToken } = parsed.data;
  let { email, organizationName } = parsed.data;
  // A personal workspace comes only through an invitation that says so
  // (docs/adr/0080); the form cannot ask for one.
  let personal: PersonalSpec | null = null;

  // An invited registration is for the address and the organization the
  // owner approved, whatever the form says: the invitation is the source,
  // the form only shows it. A key that no longer opens anything is told
  // apart from a closed door, because the person holding it did nothing
  // wrong and should ask for a new link rather than give up.
  if (invitationToken) {
    const invitation = await findValidInvitation(invitationToken);
    if (!invitation) return { ok: false, error: "invitationInvalid" };
    email = invitation.email;
    organizationName = invitation.organizationName;
    personal = invitation.personal;
  }

  // Asked again here, before an account exists: the rule may have been
  // met when the link was made and must still hold when it is used.
  if (personal) {
    const problem = personalProblem(personal, Number(todayInCopenhagen().slice(0, 4)));
    if (problem) return { ok: false, error: problem === "tooYoung" ? "tooYoung" : "invalid" };
  }

  // Checked here as well as in the Better Auth hook, so the form can say
  // something useful instead of showing a generic failure.
  if (!(await signupAllowed({ email, invitationToken }))) {
    return { ok: false, error: "closed" };
  }

  // The key reaches the gate inside Better Auth as a request header: the
  // sign-up body is Better Auth's, and a header is what its hook can read.
  const signUpHeaders = new Headers(requestHeaders);
  // Whatever the caller sent under the names this flow gives meaning to is
  // dropped first: only what this function decides may reach the gate.
  signUpHeaders.delete(INVITATION_HEADER);
  signUpHeaders.delete(TEAM_INVITATION_HEADER);
  signUpHeaders.delete(DEMO_HEADER);
  if (invitationToken) signUpHeaders.set(INVITATION_HEADER, invitationToken);

  let sessionHeaders: Headers;
  let userId: string | null = null;
  try {
    const { headers: responseHeaders, response } = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: signUpHeaders,
      returnHeaders: true,
    });
    sessionHeaders = cookieHeaderFrom(responseHeaders);
    userId = response.user?.id ?? null;
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS") {
      return { ok: false, error: "emailExists" };
    }
    await log.error("register: sign-up failed", {
      requestId: requestIdFrom(requestHeaders),
      error: errorName(error),
    });
    return { ok: false, error: "generic" };
  }

  // The account exists; the key that admitted it is spent.
  if (invitationToken && userId) {
    await consumeInvitation(invitationToken, userId);
  }

  try {
    const organization = await auth.api.createOrganization({
      body: { name: organizationName, slug: organizationSlug(organizationName) },
      headers: sessionHeaders,
    });
    if (organization) {
      await auth.api.setActiveOrganization({
        body: { organizationId: organization.id },
        headers: sessionHeaders,
      });
      if (personal && userId) {
        await setUpPersonalWorkspace({
          orgId: organization.id,
          userId,
          userName: name,
          sessionHeaders,
          spec: personal,
        });
      }
    }
  } catch (error) {
    // The user exists and is signed in; the app falls back to
    // onboarding when no organization is present.
    await log.error("register: organization creation failed", {
      requestId: requestIdFrom(requestHeaders),
      error: errorName(error),
    });
  }

  return { ok: true };
}
