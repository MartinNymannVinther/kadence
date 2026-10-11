import type { MailMessage, MailTransport } from "@/core/mail/mailer";

/**
 * A mail transport that records instead of sending (docs/adr/0086), for
 * tests: `useMailTransportForTests(new FakeTransport())`. It can be told
 * to fail the next sends, to see the retry and the log.
 *
 * A test that needs mail on also sets the five SMTP variables before
 * anything imports `@/core/env`, in `vi.hoisted`:
 *
 *   vi.hoisted(() => Object.assign(process.env, {
 *     SMTP_HOST: "smtp.test.invalid", SMTP_PORT: "587", SMTP_USER: "test",
 *     SMTP_PASSWORD: "test-password", MAIL_FROM: "Kadence <kadence@example.com>",
 *   }));
 *
 * The values are never used to connect: the mailer refuses SMTP in a test.
 */

export type SentMail = MailMessage & { from: string };

export class FakeTransport implements MailTransport {
  sent: SentMail[] = [];
  /** How many of the next sends throw, as a provider that is down would. */
  failNext = 0;
  attempts = 0;

  async send(message: SentMail): Promise<void> {
    this.attempts += 1;
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error("SMTP_DOWN");
    }
    this.sent.push(message);
  }

  to(address: string): SentMail[] {
    return this.sent.filter((m) => m.to === address);
  }

  clear(): void {
    this.sent = [];
    this.failNext = 0;
    this.attempts = 0;
  }
}

/** Every link in a mail's text. */
export function linksIn(text: string): string[] {
  return text.match(/https?:\/\/[^\s]+/g) ?? [];
}
