"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { mailLocale } from "@/core/mail/words";
import { requestPasswordLink, type ForgotResult } from "./forgot";
import { registerUserWithOrganization, type RegisterResult } from "./register";
import { getSession } from "./session";
import { askForVerification, type VerifyAsk } from "./verify";

export type { ForgotResult, RegisterResult, VerifyAsk };

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
