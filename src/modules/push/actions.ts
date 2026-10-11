"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { runAction } from "@/core/action";
import { mailLocale } from "@/core/mail/words";
import { setWeekMail, WeekMailInput } from "./mail-choice";
import { Endpoint, Kinds, reminderState, setKinds, subscribe, unsubscribe } from "./subscriptions";
import { sendTestReminder } from "./test-push";
import { pushConfig } from "./timer";

/**
 * Reminders on this browser (docs/adr/0060). Each action resolves the
 * person and the team first and takes nothing else on trust: the push
 * address must be a known push service's, and the reminders offered are
 * the person's roles', worked out on the server.
 */

const ThisBrowser = z.object({ endpoint: Endpoint });
const Choice = z.object({ endpoint: Endpoint, kinds: Kinds });
/** A test takes nothing from the browser: it goes to the person's own browsers on this team. */
const Nothing = z.object({}).strict();

export async function reminderStateAction(raw: unknown) {
  return runAction(raw, ThisBrowser, (ctx, input) => reminderState(ctx, input.endpoint));
}

export async function subscribeRemindersAction(raw: unknown) {
  return runAction(raw, ThisBrowser, (ctx, input) => subscribe(ctx, input.endpoint));
}

export async function setReminderKindsAction(raw: unknown) {
  return runAction(raw, Choice, (ctx, input) => setKinds(ctx, input.endpoint, input.kinds));
}

export async function unsubscribeRemindersAction(raw: unknown) {
  return runAction(raw, ThisBrowser, (ctx, input) => unsubscribe(ctx, input.endpoint));
}

/** "Send en prøve": one empty push to each of the person's own browsers here, three an hour. */
export async function sendTestReminderAction(raw: unknown) {
  return runAction(raw, Nothing, (ctx) => sendTestReminder(ctx, pushConfig()));
}

/** The parents' week "også på mail" (docs/adr/0086), in the language of the page it is chosen on. */
export async function setWeekMailAction(raw: unknown) {
  const locale = mailLocale(await getLocale());
  return runAction(raw, WeekMailInput, (ctx, input) => setWeekMail(ctx, input.on, locale));
}
