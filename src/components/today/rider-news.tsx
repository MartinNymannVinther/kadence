import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { Link } from "@/i18n/navigation";
import { rideNameText } from "@/modules/activities/ride-name";
import type { RiderNews as News } from "@/modules/team/news";
import { newsWhen } from "./news-when";

/**
 * "Nyt fra rytterne" on a coach's Overblik: the riders' own comments on
 * sessions, rides and days and their notes from check-in, the last 14
 * days, newest first (src/modules/team/news.ts). Each row leads to where
 * it was written — a session's comment opens the session's panel here,
 * whose thread is where the coach answers.
 */
export function RiderNews({ items, today }: { items: News[]; today: string }) {
  const t = useTranslations("today.news");
  const names = useTranslations("activities.names");
  const locale = useLocale();
  const words = {
    today: t("today"),
    yesterday: t("yesterday"),
    when: (day: string, clock: string) => t("when", { day, clock }),
  };
  const what = (item: News) => {
    if (item.kind === "checkin") return t("checkin");
    if (item.on === "day")
      return t("comment", {
        about: `${weekdayShort(item.about, locale)} ${dayMonth(item.about, locale)}`,
      });
    if (item.on === "activity")
      return item.ride ? t("comment", { about: rideNameText(item.ride, names) }) : t("commentRide");
    return t("comment", { about: item.about });
  };

  return (
    <section aria-labelledby="rider-news" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="rider-news" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm leading-relaxed">{t("hint")}</p>
      </div>
      {items.length === 0 ? (
        <p className="border-border bg-card text-meta text-2sm rounded-xl border p-4 leading-relaxed">
          {t("empty")}
        </p>
      ) : (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y overflow-hidden rounded-xl border shadow-surface">
          {items.map((item) => {
            const when = newsWhen(item.at, today, words, locale);
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  scroll={item.on !== "session"}
                  className="focus-ring hover:bg-secondary/60 flex items-start gap-3 px-4 py-3 transition-colors duration-[120ms]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm">
                      <span className="font-semibold">{item.riderName}</span>
                      <span className="text-meta"> · {what(item)}</span>
                    </span>
                    <span className="line-clamp-3 text-2sm leading-relaxed break-words">
                      {t("quote", { text: item.text })}
                    </span>
                    <span className="text-meta text-xs sm:hidden">{when}</span>
                  </span>
                  <span className="text-meta hidden shrink-0 pt-0.5 text-xs whitespace-nowrap sm:block">
                    {when}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
