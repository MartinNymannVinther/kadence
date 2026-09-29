"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dayLong } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import type { SessionTimeline } from "@/modules/rulle";
import type { RulleSession } from "@/modules/rulle/service";
import { IntervalBar } from "../interval-bar";

/**
 * What will be ridden: the session with its profile, or a ride without
 * one. Today's sessions can be chosen between when there is more than one,
 * and every note that changes what happens is said before the start — a
 * session already done, one on another day, a rider without an FTP (the
 * session is ridden freely then), a coach's trial that is never saved.
 */
export function SessionCard({
  session,
  sessions,
  timeline,
  today,
  trial,
  noFtp,
  missing,
  onChoose,
}: {
  session: RulleSession | null;
  /** The sessions to choose between: today's, and the one asked for. */
  sessions: RulleSession[];
  timeline: SessionTimeline | null;
  today: string;
  trial: boolean;
  noFtp: boolean;
  missing: boolean;
  onChoose: (id: string | null) => void;
}) {
  const t = useTranslations("rulle.session");
  const duration = useTranslations("training.duration");
  const locale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("heading")}</CardDescription>
        <CardTitle className="text-xl leading-snug">
          {session ? session.title : t("freeTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {session && timeline ? (
          <>
            <p className="text-meta text-2sm">
              {durationText(timeline.seconds / 60, duration)} ·{" "}
              {t("blocks", { count: timeline.blocks.length })}
            </p>
            {session.description && (
              <p className="text-reading line-clamp-3 leading-relaxed whitespace-pre-line">
                {session.description}
              </p>
            )}
            <IntervalBar timeline={timeline} second={0} className="h-24" />
          </>
        ) : (
          <p className="text-reading leading-relaxed">{t("freeBody")}</p>
        )}

        {missing && <Note>{t("missing")}</Note>}
        {!session && sessions.length === 0 && !missing && <Note>{t("none")}</Note>}
        {session?.done && <Note>{t("done")}</Note>}
        {session && session.onDate !== today && (
          <Note>{t("otherDay", { day: dayLong(session.onDate, locale) })}</Note>
        )}
        {session && noFtp && <Note>{t("noFtp")}</Note>}
        {trial && <Note>{t("trial")}</Note>}

        {(sessions.length > 1 || (sessions.length > 0 && session)) && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("pick")}</p>
            <div className="flex flex-wrap gap-2">
              {sessions.map((s) => (
                <Button
                  key={s.id}
                  variant={session?.id === s.id ? "default" : "outline"}
                  aria-pressed={session?.id === s.id}
                  className="max-sm:h-11"
                  onClick={() => onChoose(s.id)}
                >
                  {s.title}
                </Button>
              ))}
              <Button
                variant={session ? "outline" : "default"}
                aria-pressed={!session}
                className="max-sm:h-11"
                onClick={() => onChoose(null)}
              >
                {t("free")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-secondary/60 text-2sm rounded-lg px-3 py-2 leading-relaxed">{children}</p>
  );
}
