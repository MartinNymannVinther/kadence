import { createTranslator } from "next-intl";
import da from "../../../messages/da.json";
import en from "../../../messages/en.json";

/**
 * A mail's words (docs/adr/0086): messages/*.json's, under `mail`, in
 * the reader's language. This builds the translator without a request,
 * since a mail may go from a timer. Pure: the links are made in links.ts.
 */

export type MailLocale = "da" | "en";

/** A translator for the `mail` namespace: next-intl's, or a test's. */
export type MailTranslate = (key: string, values?: Record<string, string>) => string;

/** What a template gives back: a subject line and the text, nothing else. */
export type Mail = { subject: string; text: string };

export function mailWords(locale: MailLocale): MailTranslate {
  const messages = locale === "en" ? en : da;
  return createTranslator({ locale, messages, namespace: "mail" }) as unknown as MailTranslate;
}

export function mailLocale(value: string | null | undefined): MailLocale {
  return value === "en" ? "en" : "da";
}

/** "en" for a path under /en, Danish for everything else (next-intl's routing: no prefix is Danish). */
export function localeOfPath(path: string | null | undefined): MailLocale {
  return path === "/en" || Boolean(path?.startsWith("/en/")) || Boolean(path?.startsWith("/en?"))
    ? "en"
    : "da";
}

/** The paragraphs of a mail, a blank line between each, and Kadence's sign-off. */
export function compose(t: MailTranslate, paragraphs: string[]): string {
  return [t("greeting"), ...paragraphs, t("signoff")].join("\n\n");
}
