import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { Refused } from "@/core/action";
import { recordAuthEvent } from "@/core/audit/events";
import { formatStamp } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { invitations, organizations, users } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { mailConfigured, sendMail } from "@/core/mail/mailer";
import {
  teamInvitationMail,
  type TeamInvitationInput,
} from "@/core/mail/templates/team-invitation";
import { mailWords, type MailLocale } from "@/core/mail/words";
import { rateLimit } from "@/core/rate-limit";
import { invitationKind } from "@/core/team/invitation-kind";
import { joinUrl } from "@/core/team/service";
import { requireCoach } from "./access";

/**
 * "Send på mail" beside "Del" (docs/adr/0086): a coach sends a rider's or
 * a parent's invitation link to the address it is bound to, from the
 * links that wait and from the result of "Inviter hele holdet".
 *
 * Only a coach of the team, only an open invitation of this team, and only
 * to the invitation's own address: the browser names the invitation and
 * nothing else. The mail says who invited the person to which team, as a
 * rider or as a parent (ADR 0065's words, from `invitation_kind`), until
 * when, and the link. It goes now, with one retry; that it went is in the
 * audit trail as `invitation.mailed`, with the invitation's id and no
 * address, as the other invitation events.
 */

const HOUR = 60 * 60 * 1000;
/** Invitation mails a coach sends in an hour: a whole team and its parents, once. */
const PER_COACH = 120;
/** Mails for one invitation in an hour: a second try, not a stream. */
const PER_INVITATION = 3;

export const MailInvitationInput = z.object({ invitationId: z.string().min(1).max(200) });

function asFor(kind: Awaited<ReturnType<typeof invitationKind>>): TeamInvitationInput["as"] {
  if (kind?.kind === "rider") return "rider";
  if (kind?.kind === "guardian") return "parent";
  return "member";
}

export async function mailInvitation(
  ctx: OrgContext,
  invitationId: string,
  locale: MailLocale,
): Promise<{ email: string }> {
  if (!mailConfigured()) throw new Refused("notFound");
  await withOrgContext(ctx, (tx) => requireCoach(tx, ctx));

  const [row] = await authDb
    .select({
      id: invitations.id,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
      team: organizations.name,
      inviter: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.inviterId))
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, ctx.orgId),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) throw new Refused("notFound");

  if (
    !(await rateLimit(`invite-mail:${ctx.userId}`, PER_COACH, HOUR)).allowed ||
    !(await rateLimit(`invite-mail-for:${row.id}`, PER_INVITATION, HOUR)).allowed
  )
    throw new Refused("conflict", "too_many_mails");

  const kind = await invitationKind(row.id);
  const mail = teamInvitationMail(mailWords(locale), {
    inviter: row.inviter ?? "",
    team: row.team,
    as: asFor(kind),
    child: kind?.kind === "guardian" ? kind.riderFirstName : null,
    until: formatStamp(row.expiresAt, locale),
    url: joinUrl(row.id),
  });
  if (!(await sendMail({ to: row.email, ...mail }))) throw new Refused("generic", "mail_not_sent");

  await recordAuthEvent({
    action: "invitation.mailed",
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    entityType: "invitations",
    entityId: row.id,
  });
  return { email: row.email };
}
