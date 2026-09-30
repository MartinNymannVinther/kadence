"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dayLong } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import type { SessionTimeline } from "@/modules/rulle";
import { IntervalBar } from "../interval-bar";
import type { Picked } from "./choices";
import { SessionPicker } from "./session-picker";

/**
 * What will be ridden: the session with its profile, or a ride without
 * one. Today's planned sessions come first; with none planned, or another
 * wanted, the rider chooses from the team's library or DCU's sessions
 * (ADR 0035). Every note that changes what happens is said before the
 * start — a session already done, one on another day, a rider without an
 * FTP (the session is ridden freely then), a coach's trial that is never
 * saved, and for DCU's, when DCU puts it in a season.
 */
export function SessionCard({
  picked,
  today,
  team,
  dcu,
  timeline,
  todayDate,
  trial,
  noFtp,
  missing,
  onChoose,
}: {
  picked: Picked | null;
  today: Picked[];
  team: Picked[];
  dcu: Picked[];
  timeline: SessionTimeline | null;
  /** Today, the day in Copenhagen. */
  todayDate: string;
  trial: boolean;
  noFtp: boolean;
  missing: boolean;
  onChoose: (id: string | null) => void;
}) {
  const t = useTranslations("rulle.session");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const [picking, setPicking] = useState(false);
  const session = picked?.session ?? null;

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {picked?.kind === "team"
            ? t("fromTeam")
            : picked?.kind === "dcu"
              ? t("fromDcu")
              : t("heading")}
        </CardDescription>
        <CardTitle className="text-xl leading-snug">
          {picked ? picked.title : t("freeTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {picked && timeline ? (
          <>
            <p className="text-meta text-2sm">
              {durationText(timeline.seconds / 60, duration)} ·{" "}
              {t("blocks", { count: timeline.blocks.length })}
            </p>
            {picked.description && (
              <p className="text-reading line-clamp-3 leading-relaxed whitespace-pre-line">
                {picked.description}
              </p>
            )}
            <IntervalBar timeline={timeline} second={0} className="h-24" />
          </>
        ) : (
          <p className="text-reading leading-relaxed">{t("freeBody")}</p>
        )}

        {picked?.when && <Note>{t("whenNote", { when: picked.when })}</Note>}
        {missing && <Note>{t("missing")}</Note>}
        {!picked && today.length === 0 && !missing && <Note>{t("none")}</Note>}
        {session?.done && <Note>{t("done")}</Note>}
        {session && session.onDate !== todayDate && (
          <Note>{t("otherDay", { day: dayLong(session.onDate, locale) })}</Note>
        )}
        {picked && noFtp && <Note>{t("noFtp")}</Note>}
        {trial && <Note>{t("trial")}</Note>}
        {picked?.source && (
          <p className="text-meta text-xs leading-relaxed">
            {t("source", { source: picked.source })}
          </p>
        )}

        <Button
          variant="outline"
          className="self-start max-sm:h-11"
          onClick={() => setPicking(true)}
        >
          <ListChecks data-icon="inline-start" />
          {t("pickOther")}
        </Button>
        <SessionPicker
          open={picking}
          onOpenChange={setPicking}
          today={today}
          team={team}
          dcu={dcu}
          chosen={picked?.id ?? null}
          onChoose={onChoose}
        />
      </CardContent>
    </Card>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-secondary/60 text-2sm rounded-lg px-3 py-2 leading-relaxed">{children}</p>
  );
}
