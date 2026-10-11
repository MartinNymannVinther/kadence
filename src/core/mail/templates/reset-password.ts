import { compose, type Mail, type MailTranslate } from "../words";

/** A new password: the link, what using it does, and that ignoring it changes nothing. */
export function resetPasswordMail(t: MailTranslate, input: { url: string }): Mail {
  return {
    subject: t("reset.subject"),
    text: compose(t, [t("reset.body"), input.url, t("reset.ignore")]),
  };
}
