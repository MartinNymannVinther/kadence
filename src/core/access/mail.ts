import { and, eq, gt, isNull } from "drizzle-orm";
import { recordAuthEvent } from "@/core/audit/events";
import { formatStamp } from "@/core/dates";
import { authDb } from "@/core/db/client";
import { accessInvitations, users } from "@/core/db/schema";
import { mailConfigured, sendMail } from "@/core/mail/mailer";
import { accessInvitationMail } from "@/core/mail/templates/access-invitation";
import { mailWords, type MailLocale } from "@/core/mail/words";
import { rateLimit } from "@/core/rate-limit";
import { requirePlatformOwner } from "./owner";
import { hashInvitationToken, invitationUrl } from "./tokens";

/**
 * "Send linket" (docs/adr/0086): the owner's yes, sent to the address it
 * is bound to, so the owner no longer has to be the last mile (ADR 0004
 * said this would come with mail). The plain key is held only by the
 * owner's page, the moment after it was minted; the browser hands it back,
 * and it is sent only if its hash names an open invitation, and only to
 * that invitation's own address. Three mails an hour for one invitation.
 * On the auth role, like the rest of admission.
 */

const HOUR = 60 * 60 * 1000;
const PER_INVITATION = 3;

export type AccessMailResult = { email: string } | "notFound" | "rateLimited" | "failed" | "off";

export async function mailAccessInvitation(
  actorUserId: string,
  token: string,
  locale: MailLocale,
): Promise<AccessMailResult> {
  await requirePlatformOwner(actorUserId);
  if (!mailConfigured()) return "off";
  const [row] = await authDb
    .select({
      id: accessInvitations.id,
      email: accessInvitations.email,
      workspace: accessInvitations.organizationName,
      expiresAt: accessInvitations.expiresAt,
    })
    .from(accessInvitations)
    .where(
      and(
        eq(accessInvitations.tokenHash, hashInvitationToken(token)),
        isNull(accessInvitations.usedAt),
        isNull(accessInvitations.revokedAt),
        gt(accessInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return "notFound";
  if (!(await rateLimit(`access-mail:${row.id}`, PER_INVITATION, HOUR)).allowed)
    return "rateLimited";

  const [owner] = await authDb
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  const mail = accessInvitationMail(mailWords(locale), {
    inviter: owner?.name ?? "",
    workspace: row.workspace,
    until: formatStamp(row.expiresAt, locale),
    url: invitationUrl(token),
  });
  if (!(await sendMail({ to: row.email, ...mail }))) return "failed";

  await recordAuthEvent({
    action: "invitation.mailed",
    actorUserId,
    entityType: "access_invitations",
    entityId: row.id,
  });
  return { email: row.email };
}
