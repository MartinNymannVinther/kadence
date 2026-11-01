import { useTranslations } from "next-intl";
import { ConsentOffCard } from "@/components/consent/consent-off-card";
import { CheckinSection } from "@/components/today/checkin-section";
import { RiderChecklist } from "@/components/today/rider-checklist";
import { RpePrompt } from "@/components/today/rpe-prompt";
import { TodayRideCard } from "@/components/today/today-ride";
import { TodaySession } from "@/components/today/today-session";
import { DeviationViewerProvider } from "@/components/training/deviation-viewer";
import type { RiderDay } from "./rider-data";

/**
 * A rider's Today, and nothing else (docs/adr/0063, amended by 0077): the
 * first steps while they are not done, today's check-in first — three
 * answers on the way out of the door, and once they are given a short
 * card — then today's session with the big "Udført" and "Kør indendørs",
 * and today's rides nobody planned,
 * "how hard" about the last ride, and tomorrow. The week, the form, goals,
 * records and the upload are on Mig.
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
    const ridden = when === "today" ? day.ridden : [];
    return (
      <section aria-labelledby={`rider-${when}`} className="flex flex-col gap-3">
        <h2 id={`rider-${when}`} className="text-lg font-semibold">
          {t(when)}
        </h2>
        {sessions.length === 0 && ridden.length === 0 && (
          <p className="text-meta text-2sm">{t(when === "today" ? "rest" : "restTomorrow")}</p>
        )}
        {sessions.map((s) => (
          <TodaySession
            key={s.id}
            session={s}
            today={today}
            href={hrefFor(s.id)}
            canComplete={s.onDate <= today}
          />
        ))}
        {ridden.map((r) => (
          <TodayRideCard key={r.id} ride={r} />
        ))}
      </section>
    );
  };

  // The rider reads their own sessions: "Du kørte", and their own thresholds (ADR 0095).
  return (
    <DeviationViewerProvider viewer={{ ownRiderId: riderId, isCoach: false }}>
      <RiderChecklist facts={day.checklist} />
      {day.consent.off ? (
        <ConsentOffCard canGive={day.consent.canGive} />
      ) : (
        <CheckinSection
          riderId={riderId}
          today={today}
          initial={day.checkin}
          start={day.checkinStart}
          knownPains={day.knownPains}
          club={day.club}
        />
      )}
      {list("today")}
      {day.toRate && <RpePrompt ride={day.toRate} />}
      {list("tomorrow")}
    </DeviationViewerProvider>
  );
}
