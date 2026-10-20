import { compose, type Mail, type MailTranslate } from "../words";

/** "Bekræft din e-mailadresse": the link, and that ignoring it changes nothing. */
export function verifyAddressMail(t: MailTranslate, input: { url: string }): Mail {
  return {
    subject: t("verify.subject"),
    text: compose(t, [t("verify.body"), input.url, t("verify.ignore")]),
  };
}
