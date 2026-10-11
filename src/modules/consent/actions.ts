"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { runAction } from "@/core/action";
import { giveHealthConsentAgain, withdrawHealthConsent } from "./service";

/**
 * Withdrawing and giving again the consent to health data, under
 * Indstillinger → Data and on Today (docs/adr/0088). Each refreshes the
 * pages that show check-in and measurements.
 */

const PATHS = ["/today", "/settings/data", "/riders", "/me", "/calendar"];

export async function withdrawHealthConsentAction() {
  return runAction({}, z.object({}), (ctx) => withdrawHealthConsent(ctx), PATHS);
}

export async function giveHealthConsentAction() {
  const locale = (await getLocale()) === "en" ? "en" : "da";
  return runAction({}, z.object({}), (ctx) => giveHealthConsentAgain(ctx, locale), PATHS);
}
