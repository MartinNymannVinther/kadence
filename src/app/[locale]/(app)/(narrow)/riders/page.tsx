import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { accountState } from "@/components/team/account-badge";
import { AddRiderDialog } from "@/components/team/add-rider-dialog";
import { BulkInviteDialog } from "@/components/team/bulk-invite-dialog";
import { classText } from "@/components/team/class-text";
import { waitingRecipients } from "@/components/team/invitation-recipients";
import { RiderList } from "@/components/team/rider-list";
import { WaitingInvitations } from "@/components/team/waiting-invitations";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { listPendingInvitations } from "@/core/team/service";
import { Link, redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { listTeamGuardians } from "@/modules/team/guardians";
import { getTeamName } from "@/modules/team/name";
import { getRiders } from "@/modules/team/riders";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("riders");
  return { title: t("title") };
}

/**
 * The team's riders, for the coaches: who is on it, their class, whether
 * they have an account, and how many parents are linked. `?archived=1`
 * shows the riders who have left as well. A rider is added one at a time
 * or the whole team at once (ADR 0064), and the links not used yet wait
 * above the list.
 */
export default async function RidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("riders");
  const classes = await getTranslations("riders.class");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  if (!me?.isCoach) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <PageHeader title={t("title")} />
        <EmptyState title={t("coachOnlyTitle")} hint={t("coachOnlyBody")} />
      </div>
    );
  }

  const showArchived = (await searchParams).archived === "1";
  const [riders, guardians, invitations, team] = await Promise.all([
    getRiders(ctx, showArchived),
    listTeamGuardians(ctx),
    listPendingInvitations(ctx.orgId),
    getTeamName(ctx),
  ]);
  const pending = new Set(invitations.map((i) => i.id));
  const today = todayInCopenhagen();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <BulkInviteDialog team={team} today={today} />
            <AddRiderDialog />
          </>
        }
      />
      <WaitingInvitations
        team={team}
        recipients={waitingRecipients({ riders, guardians, pending: invitations })}
      />
      {riders.length === 0 ? (
        <EmptyState title={t("emptyTitle")} hint={t("emptyBody")} />
      ) : (
        <RiderList
          riders={riders.map((r) => ({
            id: r.id,
            name: r.name,
            birthYear: r.birthYear,
            classLabel: classText(r, today, classes),
            account: accountState(r, pending),
            parents: guardians.filter((g) => g.riderId === r.id).length,
            archived: r.archived,
          }))}
        />
      )}
      <Link
        href={showArchived ? "/riders" : "/riders?archived=1"}
        className="focus-ring text-meta hover:text-foreground w-fit text-2sm underline-offset-4 hover:underline"
      >
        {showArchived ? t("hideArchived") : t("showArchived")}
      </Link>
    </div>
  );
}
