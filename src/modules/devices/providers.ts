import type { BikeStructure } from "@/modules/workouts/structure";
import { garmin } from "./garmin";
import { polar } from "./polar";
import { wahoo } from "./wahoo";

/**
 * Wahoo, Garmin and Polar behind one small interface, so the connect flow,
 * the webhook and the push to a head unit are written once. Each adapter is
 * inert without its keys (`configured()`): the settings page says so and
 * nothing else in Kadence notices (dogma 2).
 *
 * An adapter knows its provider's endpoints and shapes and nothing about
 * the database; the services around it (links.ts, webhooks.ts, push.ts)
 * decide who may do what and write the rows.
 */

export const PROVIDER_IDS = ["wahoo", "garmin", "polar"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type Tokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  /** The account's id, when the token answer names it (Polar's `x_user_id`). */
  externalUserId?: string;
};

/** A finished activity a provider told Kadence about, and where its file is. */
export type ActivityNotification = {
  externalUserId: string;
  /** The provider's id for the activity: the dedupe key on `activities.external_id`. */
  externalId: string;
  url: string;
  fileName: string;
};

export type ActivityFile = { bytes: Uint8Array; fileName: string; externalId: string };

/** What a verified webhook asks Kadence to do; everything else in it is ignored. */
export type WebhookEvent =
  | { kind: "activity"; externalUserId: string; notification: ActivityNotification }
  | { kind: "deregistration"; externalUserId: string };

/** A planned bike session on its way to a rider's device. */
export type PushWorkout = {
  sessionId: string;
  name: string;
  description: string;
  /** The Copenhagen day it is planned for, yyyy-mm-dd. */
  onDate: string;
  structure: BikeStructure;
  rider: { ftp: number | null; thresholdHr: number | null };
  /** When the session last changed: part of the plan's identity at the provider. */
  updatedAt: Date;
};

export interface DeviceProvider {
  id: ProviderId;
  /** Both halves of the provider's keys are in the environment. */
  configured(): boolean;
  authorizeUrl(state: string, codeChallenge: string, redirectUri: string): string;
  exchangeCode(code: string, verifier: string, redirectUri: string): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
  /**
   * The provider's id for the account the token belongs to. `named` is the
   * id the token answer carried, for a provider that names it there.
   */
  userId(accessToken: string, named?: string): Promise<string>;
  /**
   * Registers the account with the provider after the OAuth round trip,
   * for a provider that requires it before any data flows (Polar).
   */
  register?(accessToken: string, externalUserId: string): Promise<void>;
  /** Tells the provider the rider has disconnected, where its API allows. */
  deregister?(accessToken: string, externalUserId: string): Promise<void>;
  /** Whether fetching an activity file takes the rider's access token. */
  fileNeedsToken: boolean;
  /**
   * Whether a webhook really came from the provider; false is a 401. `raw`
   * is the body exactly as it arrived, for a provider that signs it.
   */
  verifyWebhook(payload: unknown, headers: Headers, raw?: Uint8Array): boolean;
  /**
   * A provider's check that the webhook URL answers (Polar's PING), which
   * cannot be verified and asks for nothing: answered 200, touching nothing.
   */
  isPing?(payload: unknown, headers: Headers): boolean;
  /** The events in a verified webhook. Unknown and malformed entries are left out. */
  webhookEvents(payload: unknown): WebhookEvent[];
  fetchActivityFile(
    notification: ActivityNotification,
    accessToken: string | null,
  ): Promise<ActivityFile>;
  /** Puts a planned session on the rider's device calendar; the provider's id for it. */
  pushWorkout?(accessToken: string, workout: PushWorkout): Promise<{ externalId: string }>;
}

const PROVIDERS: Record<ProviderId, DeviceProvider> = { wahoo, garmin, polar };

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

export function providerById(id: ProviderId): DeviceProvider {
  return PROVIDERS[id];
}

/**
 * The providers this installation has keys for, in their order: the only
 * ones the devices page offers (docs/adr/0057). Without any, rides come in
 * as files, and nothing else changes.
 */
export function configuredProviders(): ProviderId[] {
  return PROVIDER_IDS.filter((id) => PROVIDERS[id].configured());
}
