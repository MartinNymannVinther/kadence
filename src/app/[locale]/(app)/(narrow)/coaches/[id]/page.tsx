import type { Metadata } from "next";
import { ChevronLeft, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Moderate,
  ReplyForm,
  ReportButton,
  TakeWorkout,
} from "@/components/community/thread-tools";
import { StructureView } from "@/components/workouts/structure-view";
import { getOrgContext } from "@/core/auth/session";
import { formatDay } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { canModerate } from "@/modules/community/moderation";
import { getThread, roomKind } from "@/modules/community/service";
import { whoAmI } from "@/modules/team/access";
import { readStructure } from "@/modules/workouts/structure";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = await getOrgContext();
  const t = await getTranslations("community");
  const thread = ctx ? await getThread(ctx, (await params).id) : null;
  return { title: thread?.title ?? t("title") };
}

/** One thread in Trænerrummet: the first post, a session if one came along, the replies, and a reply. */
export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("community");
  const { id } = await params;
  const [thread, me, moderator, room] = await Promise.all([
    getThread(ctx, id),
    whoAmI(ctx.orgId, ctx.userId),
    canModerate(ctx),
    roomKind(ctx),
  ]);
  if (!thread) notFound();
  // A demo's room is its own: nobody to report to, nothing to moderate (ADR 0054).
  const reportable = room === "installation";
  const owner = moderator && reportable;
  const byline = (name: string, club: string, at: Date) =>
    `${name || t("former")}${club ? ` (${club})` : ""} · ${formatDay(at, locale)}`;

  return (
    <div className="flex min-w-0 max-w-3xl flex-col gap-5">
      <Link
        href="/coaches"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("title")}
      </Link>
      <article className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface">
        <p className="text-meta text-xs">{t(`category.${thread.category}`)}</p>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          {thread.title}
          {thread.locked && <Lock aria-label={t("locked")} className="text-meta size-4" />}
        </h1>
        <p className="text-meta text-xs">
          {byline(thread.authorName, thread.clubName, thread.createdAt)}
        </p>
        {thread.hidden && <p className="text-destructive text-2sm">{t("thread.hiddenNote")}</p>}
        <p className="text-reading leading-relaxed whitespace-pre-line">{thread.body}</p>
        {thread.workout && (
          <section className="border-border flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-semibold">{thread.workout.name}</p>
            <StructureView
              structure={readStructure(thread.workout.structure, thread.workout.sport as "bike")}
              rider={null}
            />
            {me?.isCoach && <TakeWorkout threadId={thread.id} />}
          </section>
        )}
        <div className="flex flex-wrap items-start gap-2">
          {reportable && !thread.mine && <ReportButton targetKind="thread" targetId={thread.id} />}
          {owner && (
            <Moderate
              targetKind="thread"
              targetId={thread.id}
              hidden={thread.hidden}
              locked={thread.locked}
            />
          )}
        </div>
      </article>

      <ol className="flex flex-col gap-3">
        {thread.posts.map((p) => (
          <li
            key={p.id}
            className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4"
          >
            <p className="text-meta text-xs">{byline(p.authorName, p.clubName, p.createdAt)}</p>
            {p.hidden && <p className="text-destructive text-2sm">{t("thread.hiddenNote")}</p>}
            <p className="text-reading leading-relaxed whitespace-pre-line">{p.body}</p>
            <div className="flex flex-wrap items-start gap-2">
              {reportable && !p.mine && <ReportButton targetKind="post" targetId={p.id} />}
              {owner && <Moderate targetKind="post" targetId={p.id} hidden={p.hidden} />}
            </div>
          </li>
        ))}
      </ol>

      {thread.locked ? (
        <p className="text-meta text-2sm">{t("thread.lockedNote")}</p>
      ) : me?.isCoach ? (
        <ReplyForm threadId={thread.id} />
      ) : (
        <p className="text-meta text-2sm">{t("writeFromTeam")}</p>
      )}
    </div>
  );
}
