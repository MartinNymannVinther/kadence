import { describe, expect, it } from "vitest";
import { plainSmtpAllowed } from "@/core/mail/mailer";

/**
 * The one case Kadence speaks SMTP without TLS: a mail catcher on the
 * developer's own machine (docker-compose.dev.yml), outside production
 * (docs/adr/0086, amended 2026-10-12). A real provider is never spoken to
 * in the clear, and production never is at all.
 */
describe("plain SMTP", () => {
  it("is allowed only to the machine itself, outside production", () => {
    expect(plainSmtpAllowed("localhost", "development")).toBe(true);
    expect(plainSmtpAllowed("127.0.0.1", "test")).toBe(true);
    expect(plainSmtpAllowed("::1", "development")).toBe(true);
  });

  it("is refused for any other host, and for everything in production", () => {
    expect(plainSmtpAllowed("send.one.com", "development")).toBe(false);
    expect(plainSmtpAllowed("smtp.tem.scaleway.com", "development")).toBe(false);
    expect(plainSmtpAllowed("localhost", "production")).toBe(false);
    expect(plainSmtpAllowed(undefined, "development")).toBe(false);
  });
});
