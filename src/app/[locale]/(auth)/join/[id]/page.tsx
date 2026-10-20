import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { personalWorkspaceOf } from "@/core/access/workspaces";
import { getSession } from "@/core/auth/session";
import { invitationKind } from "@/core/team/invitation-kind";
import { findTeamInvitation } from "@/core/team/service";
import { Link } from "@/i18n/navigation";
import { isCoachRole } from "@/modules/team/access";
import { ownRiderIn } from "@/modules/team/history-move";
import { joinAs } from "./join-as";
import { AcceptForm } from "./accept-form";
import { JoinRegisterForm } from "./join-forms";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return { title: t("title") };
}

/**
 * The page behind an invitation link. It says who invited whom onto
 * which team, and as what — "som træner" by the invitation's role, "som
 * rytter" or "som forælder til Emma" by the row a coach prepared, which
 * only `invitation_kind` may tell the auth role about (docs/adr/0065) —
 * and in one line what comes after (docs/adr/0063). Then it does the
 * one right thing for whoever opened it: a stranger registers for the
 * address the invitation names, the person it was sent to accepts with
 * one click, and somebody signed in as anyone else is told so rather
 * than let through.
 *
 * A rider who owns a personal workspace with their own training in it is
 * asked one thing more before accepting: "Tag din træning med over på
 * holdet?" (docs/adr/0081). The question is shown only when there is
 * something of theirs to move.
 */
async function historyToOffer(userId: string): Promise<{ workspaceName: string } | null> {
  const personal = await personalWorkspaceOf(userId);
  if (!personal) return null;
  const own = await ownRiderIn({ orgId: personal.orgId, userId });
  return own ? { workspaceName: personal.name } : null;
}

export default async function JoinPage({ params }: Params) {
  const { id } = await params;
  const t = await getTranslations("join");
  const invitation = await findTeamInvitation(id);
  const session = await getSession();

  if (!invitation || invitation.state !== "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("invalidTitle")}</CardTitle>
          <CardDescription>
            {invitation?.state === "accepted" ? t("acceptedBody") : t("invalidBody")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("toLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const coach = isCoachRole(invitation.role);
  const kind = coach ? null : await invitationKind(invitation.id);
  const { role, child } = joinAs(coach, kind);
  const intro = `${t("intro", {
    inviter: invitation.inviterName || t("someone"),
    team: invitation.workspaceName,
    role,
    child,
  })} ${t("next", { role, child })}`;

  if (session && session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{intro}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>{t("wrongAccount", { email: invitation.email, current: session.user.email })}</p>
          <AcceptForm invitationId={invitation.id} mode="switch" />
        </CardContent>
      </Card>
    );
  }

  if (session) {
    const history = kind?.kind === "rider" ? await historyToOffer(session.user.id) : null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{intro}</CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptForm invitationId={invitation.id} mode="accept" history={history} />
        </CardContent>
      </Card>
    );
  }

  return (
    <JoinRegisterForm
      invitationId={invitation.id}
      email={invitation.email}
      workspaceName={invitation.workspaceName}
      intro={intro}
    />
  );
}
