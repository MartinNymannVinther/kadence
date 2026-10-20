"use server";

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { workspaceNameKey } from "@/core/access/personal";
import { mailLocale } from "@/core/mail/words";
import { requestPasswordLink, type ForgotResult } from "./forgot";
import { registerUserWithOrganization, type RegisterResult } from "./register";
import { landingAfterVerify, registerSelf, type SelfSignupResult } from "./register-self";
import { getSession } from "./session";
import { askForVerification, type VerifyAsk } from "./verify";
import { awaitingVerification } from "./verify-first";

export type { ForgotResult, RegisterResult, SelfSignupResult, VerifyAsk };

/** Server-action wrapper around the framework-free registration flow. */
export async function registerAction(input: unknown): Promise<RegisterResult> {
  return registerUserWithOrganization(await headers(), input);
}

/** "Glemt adgangskode?": the same answer for every address (docs/adr/0086). */
export async function forgotPasswordAction(input: unknown): Promise<ForgotResult> {
  return requestPasswordLink(await headers(), input, mailLocale(await getLocale()));
}

/** "Bekræft din adresse": a link to the signed-in person's own address, and nobody else's. */
export async function askForVerificationAction(): Promise<VerifyAsk | "unauthorized"> {
  const session = await getSession();
  if (!session) return "unauthorized";
  return askForVerification(
    await headers(),
    { id: session.user.id, email: session.user.email },
    mailLocale(await getLocale()),
  );
}

/**
 * Door 2 (docs/adr/0088): a person creates their own workspace. Named
 * after the rider's first name in the language of the page ("Emmas
 * træning"), as an approved application is.
 */
export async function registerSelfAction(input: unknown): Promise<SelfSignupResult> {
  const t = await getTranslations("auth.apply");
  return registerSelf(await headers(), input, {
    workspaceName: (first) => t(workspaceNameKey(first), { name: first }),
    locale: mailLocale(await getLocale()),
  });
}

/**
 * "Send mailen igen" on /verify and in the stripe at the top of the app
 * (docs/adr/0088): for a door-2 account still waiting, inside its week or
 * past it, landing on Today. Three an hour, as any confirmation link.
 */
export async function resendVerificationAction(): Promise<VerifyAsk | "unauthorized"> {
  const session = await getSession();
  if (!session) return "unauthorized";
  if (!(await awaitingVerification(session.user))) return "verified";
  const locale = mailLocale(await getLocale());
  return askForVerification(
    await headers(),
    { id: session.user.id, email: session.user.email },
    locale,
    landingAfterVerify(locale),
  );
}
