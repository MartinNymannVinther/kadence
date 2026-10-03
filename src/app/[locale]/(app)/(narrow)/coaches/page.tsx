import type { Metadata } from "next";
import { Lock, MessagesSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { HandleReport } from "@/components/community/thread-tools";
import { NewThread } from "@/components/community/new-thread";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/core/auth/session";
import { formatDay } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { openReports } from "@/modules/community/moderation";
import { CATEGORIES, listThreads, type Category } from "@/modules/community/service";
import { whoAmI } from "@/modules/team/access";
import { listTemplates } from "@/modules/training/templates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community");
  return { title: t("title") };
}

/**
 * Trænerrummet (ADR 0052): the coaches on the installation, across clubs,
 * sharing what they know. Threads newest-active first, narrowed by
 * category, with a new thread at the top; the owner's open reports above
 * all. Riders and parents never get here.
 */
export default async function CoachesRoomPage({
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
  const t = await getTranslations("community");
  const asked = (await searchParams).category;
  const category = CATEGORIES.includes(asked as Category) ? (asked as Category) : undefined;
  const threads = await listThreads(ctx, category);
  if (threads === null) notFound();
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const [templates, reports] = await Promise.all([
    me?.isCoach ? listTemplates(ctx) : Promise.resolve([]),
    openReports(ctx),
  ]);

  return (
    <div className="flex min-w-0 max-w-3xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {reports.length > 0 && (
        <section className="bg-warning-tint flex flex-col gap-2 rounded-xl p-4">
          <h2 className="text-base font-semibold">
            {t("reports.title", { count: reports.length })}
          </h2>
          <ul className="flex flex-col gap-2">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-2sm">
                <span>
                  {r.threadId ? (
                    <Link href={`/coaches/${r.threadId}`} className="text-primary hover:underline">
                      {t(r.targetKind === "thread" ? "reports.thread" : "reports.post")}
                    </Link>
                  ) : (
                    t("reports.gone")
                  )}
                  {r.reason && <span className="text-meta"> · {r.reason}</span>}
                </span>
                <HandleReport reportId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {me?.isCoach ? (
        <NewThread templates={templates.map((tpl) => ({ id: tpl.id, name: tpl.name }))} />
      ) : (
        <p className="text-meta text-2sm">{t("writeFromTeam")}</p>
      )}

      <nav aria-label={t("categories")} className="flex flex-wrap gap-2">
        {[undefined, ...CATEGORIES].map((c) => (
          <Link
            key={c ?? "all"}
            href={c ? `/coaches?category=${c}` : "/coaches"}
            aria-current={c === category ? "page" : undefined}
            className={cn(
              "rounded-md border px-3 py-1.5 text-2sm",
              c === category ? "border-primary font-semibold" : "border-border",
            )}
          >
            {c ? t(`category.${c}`) : t("all")}
          </Link>
        ))}
      </nav>

      {threads.length === 0 ? (
        <EmptyState title={t("empty.title")} hint={t("empty.body")} />
      ) : (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-[var(--surface-shadow)]">
          {threads.map((th) => (
            <li
              key={th.id}
              className={cn("flex flex-col gap-1 px-4 py-3", th.hidden && "opacity-60")}
            >
              <Link
                href={`/coaches/${th.id}`}
                className="focus-ring hover:text-primary flex items-center gap-2 text-sm font-semibold"
              >
                {th.unread && (
                  <span
                    aria-label={t("unread")}
                    className="bg-primary inline-block size-2 shrink-0 rounded-full"
                  />
                )}
                <span className="min-w-0 break-words">{th.title}</span>
                {th.locked && (
                  <Lock aria-label={t("locked")} className="text-meta size-3.5 shrink-0" />
                )}
              </Link>
              <p className="text-meta flex flex-wrap items-center gap-x-2 text-xs">
                <span>{t(`category.${th.category}`)}</span>
                <span>·</span>
                <span>{th.authorName || t("former")}</span>
                {th.clubName && <span>({th.clubName})</span>}
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MessagesSquare aria-hidden className="size-3" />
                  {th.replies}
                </span>
                <span>·</span>
                <span>{formatDay(th.lastPostAt, locale)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
