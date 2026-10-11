import { compose, type Mail, type MailTranslate } from "../words";

/**
 * "Du er inviteret": who invited the person to which team, as a rider or
 * as a parent (docs/adr/0065's words), until when the link works, and the
 * link. For a parent the rider's first name, as the join page says it;
 * nothing else about anyone.
 */
export type TeamInvitationInput = {
  inviter: string;
  team: string;
  as: "rider" | "parent" | "member";
  /** A parent's child's first name, when the invitation knows it. */
  child: string | null;
  until: string;
  url: string;
};

function who(t: MailTranslate, input: TeamInvitationInput): string {
  const values = { inviter: input.inviter, team: input.team };
  if (input.as === "rider") return t("invite.rider", values);
  if (input.as === "parent" && input.child)
    return t("invite.parentOf", { ...values, child: input.child });
  if (input.as === "parent") return t("invite.parent", values);
  return t("invite.member", values);
}

export function teamInvitationMail(t: MailTranslate, input: TeamInvitationInput): Mail {
  const next =
    input.as === "parent"
      ? [input.child ? t("invite.parentNext", { child: input.child }) : t("invite.parentNextPlain")]
      : [];
  return {
    subject: t("invite.subject", { team: input.team }),
    text: compose(t, [
      who(t, input),
      t("invite.how", { until: input.until }),
      input.url,
      ...next,
      t("invite.unknown", { inviter: input.inviter }),
    ]),
  };
}
