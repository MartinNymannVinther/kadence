"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { Endpoint, Kinds, reminderState, setKinds, subscribe, unsubscribe } from "./subscriptions";

/**
 * Reminders on this browser (docs/adr/0060). Each action resolves the
 * person and the team first and takes nothing else on trust: the push
 * address must be a known push service's, and the reminders offered are
 * the person's roles', worked out on the server.
 */

const ThisBrowser = z.object({ endpoint: Endpoint });
const Choice = z.object({ endpoint: Endpoint, kinds: Kinds });

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
