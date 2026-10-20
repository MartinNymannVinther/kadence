import { createTransport } from "nodemailer";
import { env } from "@/core/env";
import { errorName, log } from "@/core/log";

/**
 * Mail through an EU provider (docs/adr/0086). Optional: without the five
 * SMTP variables nothing is sent and every page behaves as it did before
 * there was mail. With them, Kadence sends five things and nothing else —
 * a link to confirm an address, a link to choose a new password, an
 * invitation, the parents' "der er nyt om ugen", and with BILLING=on a
 * word to a workspace's owner about its trial or payment — each built by a
 * template in ./templates that carries a link to Kadence and no word about
 * training or health. E-mail is not a secure channel, so a mail is a door
 * to Kadence, never the content.
 *
 * Never log the address, the subject or the text: the log gets the
 * error's name and nothing else (src/core/log.ts).
 */

export type MailMessage = { to: string; subject: string; text: string; html?: string };

/** What sends a message. The SMTP one in production, a recording one in tests. */
export interface MailTransport {
  send(message: MailMessage & { from: string }): Promise<void>;
}

/** How long the one retry waits; a provider that refused a moment ago often takes it now. */
const RETRY_AFTER_MS = 1_000;
/** A provider that does not answer is given up on rather than holding a request open. */
const TIMEOUT_MS = 10_000;

const state = globalThis as unknown as {
  kadenceMailTransport?: MailTransport;
  kadenceMailOverride?: MailTransport | null;
  kadenceMailInFlight?: Set<Promise<boolean>>;
};

/** Whether this installation sends mail at all. Every mail-shaped button asks this first. */
export function mailConfigured(): boolean {
  return Boolean(
    env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM,
  );
}

/**
 * A mail catcher on this machine while developing (Mailpit in
 * docker-compose.dev.yml): nothing leaves the loopback interface, so
 * there is nothing for TLS to protect. Only outside production, and only
 * for a host that is the machine itself; a real provider is never
 * spoken to in the clear.
 */
export function plainSmtpAllowed(host: string | undefined, nodeEnv: string): boolean {
  return (
    nodeEnv !== "production" && (host === "localhost" || host === "127.0.0.1" || host === "::1")
  );
}

function loopbackCatcher(): boolean {
  return plainSmtpAllowed(env.SMTP_HOST, env.NODE_ENV);
}

/**
 * The SMTP transport, made once per process. Port 465 speaks TLS from the
 * first byte; every other port must upgrade with STARTTLS or the
 * transport refuses, so a password never crosses in the clear. The one
 * exception is the catcher on the developer's own machine.
 */
function smtpTransport(): MailTransport {
  const plain = loopbackCatcher();
  const mailer = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465 && !plain,
    ignoreTLS: plain,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  return {
    async send(message) {
      await mailer.sendMail(message);
    },
  };
}

function transport(): MailTransport {
  if (state.kadenceMailOverride) return state.kadenceMailOverride;
  // The suite never reaches a real provider, whatever a developer's .env holds.
  if (process.env.NODE_ENV === "test") throw new Error("MAIL_TRANSPORT_NOT_SET_IN_TEST");
  state.kadenceMailTransport ??= smtpTransport();
  return state.kadenceMailTransport;
}

/**
 * One attempt, which throws on failure. For a caller that keeps its own
 * account of retries — the job runner that will carry mail later
 * (backlog S-06) wraps this and decides when to try again.
 */
export async function sendMailOnce(message: MailMessage): Promise<void> {
  if (!mailConfigured()) throw new Error("MAIL_NOT_CONFIGURED");
  await transport().send({ ...message, from: env.MAIL_FROM! });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends now, from the request that asked, with one retry. Answers whether
 * it went; a failure is logged by name only, never with the address.
 * Without mail set up it sends nothing and answers false.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!mailConfigured()) return false;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await sendMailOnce(message);
      return true;
    } catch (error) {
      await log.error("mail: not sent", { attempt, error: errorName(error) });
      if (attempt === 1) await wait(state.kadenceMailOverride ? 0 : RETRY_AFTER_MS);
    }
  }
  return false;
}

/**
 * Sends without holding the answer up, for the doors where how long the
 * answer takes must not tell whether an address exists (a new password,
 * a confirmation asked for without signing in). Same retry, same log.
 */
export function sendMailLater(message: MailMessage): void {
  const inFlight = (state.kadenceMailInFlight ??= new Set());
  const sending = sendMail(message);
  inFlight.add(sending);
  void sending.finally(() => inFlight.delete(sending));
}

/** Only for tests: send through `fake` instead of SMTP, or back to none. */
export function useMailTransportForTests(fake: MailTransport | null): void {
  state.kadenceMailOverride = fake;
}

/** Only for tests: wait until every mail sent with `sendMailLater` has gone or failed. */
export async function settleMail(): Promise<void> {
  await Promise.all([...(state.kadenceMailInFlight ?? [])]);
}
