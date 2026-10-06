"use client";

/**
 * The browser's half of reminders (docs/adr/0060): the service worker at
 * /sw.js, the permission, and the push subscription made with the
 * installation's public key. Nothing here talks to Kadence; the card
 * saves the address through a server action.
 */

export type Support = "ok" | "ios" | "unsupported";

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with a touch screen.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function installed(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** Whether this browser can take reminders; on iPhone, only from the home screen. */
export function pushSupport(): Support {
  const able = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (able) return "ok";
  return isIos() && !installed() ? "ios" : "unsupported";
}

/** The browser's side of reminders, for the status line under the card (P1-05). */
export type Diagnosis = {
  permission: NotificationPermission | "unsupported";
  /** Whether Kadence's worker, /sw.js, is registered. */
  worker: boolean;
  /** Whether this browser holds a push subscription for Kadence. */
  subscription: boolean;
  ios: boolean;
  /** Opened from the home screen rather than in the browser. */
  standalone: boolean;
};

/** What this browser says about itself; nothing here leaves it. */
export async function diagnose(): Promise<Diagnosis> {
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  let worker = false;
  let subscription = false;
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
    const script = registration?.active ?? registration?.waiting ?? registration?.installing;
    worker = Boolean(script && new URL(script.scriptURL).pathname === "/sw.js");
    const held = await registration?.pushManager?.getSubscription().catch(() => null);
    subscription = Boolean(held);
  }
  return { permission, worker, subscription, ios: isIos(), standalone: installed() };
}

export function permissionDenied(): boolean {
  return "Notification" in window && Notification.permission === "denied";
}

/** The base64url public key as the bytes `subscribe` wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, i) => byte === key[i]);
}

/** This browser's push subscription for Kadence, if it has one. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Asks for permission first — the one step that needs the tap — then
 * registers the worker and subscribes. A subscription made with another
 * key (the installation changed its pair) is replaced.
 */
export async function subscribeBrowser(publicKey: string): Promise<PushSubscription | "denied"> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  const key = keyBytes(publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing && sameKey(existing, key)) return existing;
  if (existing) await existing.unsubscribe();
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}
