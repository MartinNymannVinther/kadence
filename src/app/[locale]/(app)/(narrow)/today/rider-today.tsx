import { useTranslations } from "next-intl";
import { CheckinSection } from "@/components/today/checkin-section";
import { RiderChecklist } from "@/components/today/rider-checklist";
import { RpePrompt } from "@/components/today/rpe-prompt";
import { TodaySession } from "@/components/today/today-session";
import type { RiderDay } from "./rider-data";

/**
 * A rider's Today, and nothing else (docs/adr/0063): the first steps while
 * they are not done, today's session with the big "Udført" and "Kør
 * indendørs", "how hard" about the last ride, today's check-in, and
 * tomorrow. The week, the form, goals, records and the upload are on Mig.
 */
export function RiderToday({
  riderId,
  day,
  today,
  hrefFor,
}: {
  riderId: string;
  day: RiderDay;
  today: string;
  hrefFor: (sessionId: string) => string;
}) {
  const t = useTranslations("today.rider");
  const list = (when: "today" | "tomorrow") => {
    const sessions = day[when];
    return (
      <section aria-labelledby={`rider-${when}`} className="flex flex-col gap-3">
        <h2 id={`rider-${when}`} className="text-lg font-semibold">
          {t(when)}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-meta text-2sm">{t(when === "today" ? "rest" : "restTomorrow")}</p>
        ) : (
          sessions.map((s) => (
            <TodaySession
              key={s.id}
              session={s}
              today={today}
              href={hrefFor(s.id)}
              canComplete={s.onDate <= today}
            />
          ))
        )}
      </section>
    );
  };

  return (
    <>
      <RiderChecklist facts={day.checklist} />
      {list("today")}
      {day.toRate && <RpePrompt ride={day.toRate} />}
      <CheckinSection riderId={riderId} today={today} initial={day.checkin} />
      {list("tomorrow")}
    </>
  );
}
