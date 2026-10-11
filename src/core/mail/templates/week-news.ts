import { compose, type Mail, type MailTranslate } from "../words";

/**
 * The parents' week (docs/adr/0060) as a mail: that there is news, and a
 * link. Like the push, it says nothing about the child — not a name, not
 * a session — so an inbox holds nothing a login does not guard.
 */
export function weekNewsMail(t: MailTranslate, input: { url: string }): Mail {
  return {
    subject: t("week.subject"),
    text: compose(t, [t("week.body"), input.url, t("week.why")]),
  };
}
