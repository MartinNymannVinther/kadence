import { MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";

export type ChildThread = {
  /** A planned session's conversation, or a ride's that nobody planned. */
  kind: "session" | "activity";
  id: string;
  title: string;
  sport: string;
  onDate: string;
  count: number;
};

/**
 * The conversations about the child's training lately (ADR 0012): each
 * session or ride the coach and the rider wrote about, newest first, with
 * the way to read it. A parent reads along and never writes.
 */
export function ChildThreads({
  threads,
  hrefFor,
}: {
  threads: ChildThread[];
  hrefFor: (sessionId: string) => string;
}) {
  const t = useTranslations("parents.child");
  const sports = useTranslations("training.sport");
  const locale = useLocale();
  if (threads.length === 0) return <p className="text-meta text-2sm">{t("noThreads")}</p>;
  return (
    <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
      {threads.map((thread) => (
        <li key={`${thread.kind}-${thread.id}`}>
          <Link
            href={thread.kind === "session" ? hrefFor(thread.id) : `/activities/${thread.id}`}
            scroll={false}
            className="focus-ring hover:text-primary flex min-h-11 items-center gap-2 px-4 py-2.5 text-2sm"
          >
            <SportIcon sport={thread.sport} className="size-3.5" />
            <span className="text-meta w-20 shrink-0 text-xs first-letter:uppercase">
              {weekdayShort(thread.onDate, locale)} {dayMonth(thread.onDate, locale)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {thread.title || sports(thread.sport as "bike")}
            </span>
            <span className="text-meta flex shrink-0 items-center gap-1 text-xs">
              <MessageSquare aria-hidden className="size-3.5" />
              {t("comments", { count: thread.count })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
