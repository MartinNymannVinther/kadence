import { compose, type Mail, type MailTranslate } from "../words";

/**
 * The owner's yes (docs/adr/0004): who let the person in, the workspace
 * they will make, until when the link works, and the link.
 */
export function accessInvitationMail(
  t: MailTranslate,
  input: { inviter: string; workspace: string; until: string; url: string },
): Mail {
  return {
    subject: t("access.subject"),
    text: compose(t, [
      t("access.body", { inviter: input.inviter, workspace: input.workspace }),
      t("access.how", { until: input.until }),
      input.url,
      t("access.unknown"),
    ]),
  };
}
