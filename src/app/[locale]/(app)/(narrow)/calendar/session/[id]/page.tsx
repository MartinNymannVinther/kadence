import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { calendarHref } from "@/components/calendar/href";
import { SessionView } from "@/components/session/session-view";
import { getOrgContext } from "@/core/auth/session";
import { mondayOf } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { getSession as getPlannedSession } from "@/modules/training/sessions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("sessionPanel") };
}

/**
 * A session on its own page, for a link sent on — the same view as the
 * calendar's panel, with the way back to the week it belongs to.
 */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const { id } = await params;
  const t = await getTranslations("calendar");
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const session = me ? await getPlannedSession(ctx, id) : null;
  const back = session
    ? calendarHref({
        week: mondayOf(session.onDate),
        rider: me?.rider?.id === session.riderId ? null : session.riderId,
      })
    : "/calendar";

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Link
        href={back}
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("backToWeek")}
      </Link>
      {me && session ? (
        <SessionView ctx={ctx} me={me} sessionId={id} closeHref={back} heading="h1" />
      ) : (
        <EmptyState title={t("sessionMissing")} hint={t("sessionMissingHint")} />
      )}
    </div>
  );
}
