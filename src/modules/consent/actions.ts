"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { runAction, STILL_ALLOWED } from "@/core/action";
import { giveGarminAiConsent, withdrawGarminAiConsent } from "./garmin-ai";
import { giveHealthConsentAgain, withdrawHealthConsent } from "./service";

/**
 * Withdrawing and giving again the consent to health data, under
 * Indstillinger → Data and on Today (docs/adr/0088). Each refreshes the
 * pages that show check-in and measurements.
 */

const PATHS = ["/today", "/settings/data", "/riders", "/me", "/calendar"];
const GARMIN_PATHS = ["/settings/devices"];

export async function withdrawHealthConsentAction() {
  return runAction({}, z.object({}), (ctx) => withdrawHealthConsent(ctx), PATHS, STILL_ALLOWED);
}

export async function giveHealthConsentAction() {
  const locale = (await getLocale()) === "en" ? "en" : "da";
  return runAction({}, z.object({}), (ctx) => giveHealthConsentAgain(ctx, locale), PATHS);
}

/** The rider's own yes to the AI reading their rides from Garmin (docs/adr/0112). */
export async function giveGarminAiConsentAction() {
  const locale = (await getLocale()) === "en" ? "en" : "da";
  return runAction({}, z.object({}), (ctx) => giveGarminAiConsent(ctx, locale), GARMIN_PATHS);
}

export async function withdrawGarminAiConsentAction() {
  return runAction(
    {},
    z.object({}),
    (ctx) => withdrawGarminAiConsent(ctx),
    GARMIN_PATHS,
    STILL_ALLOWED,
  );
}
