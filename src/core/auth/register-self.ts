import { APIError } from "better-auth";
import { z } from "zod";
import { firstName, PersonalFields, personalProblem, riderNameFor } from "@/core/access/personal";
import { todayInCopenhagen } from "@/core/dates";
import { env } from "@/core/env";
import { errorName, log, requestIdFrom } from "@/core/log";
import { mailConfigured } from "@/core/mail/mailer";
import type { MailLocale } from "@/core/mail/words";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { organizationSlug } from "@/lib/slug";
import { startPlanQuietly } from "@/modules/billing/start";
import { recordSignupConsents } from "@/modules/consent/service";
import { auth } from "./auth";
import { cookieHeaderFrom } from "./cookies";
import { setUpPersonalWorkspace } from "./register-personal";
import { selfSignupHeaders, signupAllowed } from "./signup";

/**
 * Door 2 (docs/adr/0088): a person creates their own workspace — for
 * themselves from 15, or for their child — without an application, on an
 * installation with `SIGNUP=individuals`, which only starts with mail. The
 * account is made, signed in and sent a link to confirm the address, and
 * the person is in their workspace at once; a week later, if the address is
 * still not confirmed, they see /verify and nothing else until it is
 * (verify-first.ts, ADR 0088 amended 12 October 2026). The two yeses on the form, the terms and the consent
 * to health data, are stored with the version of their words.
 *
 * Framework-free, as the other registrations, so it is tested outside
 * Next.js. The caller names the workspace (the server action does it in
 * the reader's language) and says which language the person read in.
 */

const HOUR = 60 * 60 * 1000;
/** Accounts one network address may create in an hour, as applications (ADR 0004). */
export const SELF_SIGNUPS_PER_HOUR = 5;

export const SelfSignupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  password: z.string().min(12).max(128),
  personal: PersonalFields,
  /** Honeypot. Humans never see it; anything in it is a bot. */
  website: z.string().max(200).optional().or(z.literal("")),
});

/** Both boxes, ticked: the terms, and the explicit consent to health data. */
const Consents = z.object({ terms: z.literal(true), health: z.literal(true) });

export type SelfSignupResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "consent" | "tooYoung" | "tooMany" | "emailExists" | "closed" | "generic";
    };

export type SelfSignupOptions = {
  /** The workspace's name from the rider's first name ("Emmas træning"). */
  workspaceName: (riderFirstName: string) => string;
  locale: MailLocale;
};

/** Where the confirmation link lands: Today, in the language the person signed up in. */
export function landingAfterVerify(locale: MailLocale): string {
  return locale === "en" ? "/en/today" : "/today";
}

export async function registerSelf(
  requestHeaders: Headers,
  input: unknown,
  options: SelfSignupOptions,
): Promise<SelfSignupResult> {
  const parsed = SelfSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, password, personal, website } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // A filled honeypot gets an answer that looks like success and leaves
  // nothing: no account, no count.
  if (website) return { ok: true };
  if (!Consents.safeParse(input).success) return { ok: false, error: "consent" };

  // The door itself, before anything is counted: individuals, with mail.
  if (env.SIGNUP !== "individuals" || !mailConfigured()) return { ok: false, error: "closed" };

  // The age rule of an application (src/core/access/age.ts), asked again.
  const problem = personalProblem(personal, Number(todayInCopenhagen().slice(0, 4)));
  if (problem) return { ok: false, error: problem === "tooYoung" ? "tooYoung" : "invalid" };

  if (
    !(await rateLimit(callerKey(requestHeaders, "self-signup"), SELF_SIGNUPS_PER_HOUR, HOUR))
      .allowed
  )
    return { ok: false, error: "tooMany" };

  // Asked here as well as in Better Auth's hook, so the form can say so.
  if (!(await signupAllowed({ email, selfSignup: true, kind: "personal" })))
    return { ok: false, error: "closed" };

  let sessionHeaders: Headers;
  let userId: string;
  try {
    const { headers: responseHeaders, response } = await auth.api.signUpEmail({
      body: { name, email, password },
      headers: selfSignupHeaders(requestHeaders, "personal", email),
      returnHeaders: true,
    });
    sessionHeaders = cookieHeaderFrom(responseHeaders);
    userId = response.user.id;
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "USER_ALREADY_EXISTS") {
      return { ok: false, error: "emailExists" };
    }
    await log.error("register-self: sign-up failed", {
      requestId: requestIdFrom(requestHeaders),
      error: errorName(error),
    });
    return { ok: false, error: "generic" };
  }

  try {
    const workspace = options.workspaceName(firstName(riderNameFor(personal, name)));
    const organization = await auth.api.createOrganization({
      body: { name: workspace.slice(0, 200), slug: organizationSlug(workspace) },
      headers: sessionHeaders,
    });
    if (!organization) throw new Error("NO_WORKSPACE");
    await auth.api.setActiveOrganization({
      body: { organizationId: organization.id },
      headers: sessionHeaders,
    });
    const riderId = await setUpPersonalWorkspace({
      orgId: organization.id,
      userId,
      userName: name,
      sessionHeaders,
      spec: personal,
    });
    await recordSignupConsents(
      { orgId: organization.id, userId },
      { riderId, locale: options.locale },
    );
    // A trial, or free for a young rider (docs/adr/0090); nothing while BILLING=off.
    await startPlanQuietly(organization.id, { kind: "personal", birthYear: personal.birthYear });
  } catch (error) {
    // The account exists without a workspace that holds its consent, so it
    // has no team to act in; unconfirmed, the sweep takes it in thirty
    // days. The person is told to try again.
    await log.error("register-self: workspace not made", {
      requestId: requestIdFrom(requestHeaders),
      error: errorName(error),
    });
    return { ok: false, error: "generic" };
  }

  await sendFirstConfirmation(sessionHeaders, email, options.locale, requestHeaders);
  return { ok: true };
}

/** The first "Bekræft din adresse", from the new session; /verify can send it again. */
async function sendFirstConfirmation(
  sessionHeaders: Headers,
  email: string,
  locale: MailLocale,
  requestHeaders: Headers,
): Promise<void> {
  try {
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: landingAfterVerify(locale) },
      headers: sessionHeaders,
    });
  } catch (error) {
    await log.error("register-self: confirmation not asked for", {
      requestId: requestIdFrom(requestHeaders),
      error: errorName(error),
    });
  }
}
