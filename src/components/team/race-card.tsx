"use client";

import { useId, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { placeText } from "@/components/calendar/event-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { refreshRacesAction, saveUciIdAction } from "@/modules/results/actions";
import type { RefreshOutcome } from "@/modules/results/refresh";

export type RaceCardResult = {
  racedOn: string;
  race: string;
  raceClass: string;
  place: number | null;
  placeNote: string;
  resultUrl: string;
};

export type RaceCardStatus = {
  uciId: string | null;
  /** The ID as the licence prints it. */
  printed: string | null;
  /** The rider's page at Cykling Danmark. */
  profileUrl: string | null;
  reads: boolean;
  installationReads: boolean;
  checkedAt: string | null;
  error: string;
  latest: RaceCardResult[];
};

const ERRORS = ["unknown", "wrong_rider", "not_profile", "timeout", "network"] as const;

/**
 * A rider's races from Cykling Danmark, on the coach's page for the rider
 * (ADR 0039): the UCI ID from the licence, the rider's page at the
 * portal, whether and when Kadence last read it, and the latest races.
 * The races go into the rider's calendar; the places are the coach's.
 */
export function RaceCard({ riderId, status }: { riderId: string; status: RaceCardStatus }) {
  const t = useTranslations("riders.races");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const inputId = useId();
  const [uciId, setUciId] = useState(status.printed ?? "");
  const format = (iso: string, withTime: boolean) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
      day: "numeric",
      month: "short",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
      timeZone: "Europe/Copenhagen",
    }).format(new Date(withTime ? iso : `${iso}T12:00:00Z`));
  const errorText = (error: string) =>
    t(`errors.${ERRORS.includes(error as "unknown") ? (error as "unknown") : "other"}`);
  const report = (outcome: RefreshOutcome | null) => {
    if (outcome?.state === "failed") toast.error(errorText(outcome.error));
    else if (outcome?.state === "read") toast.success(t("read", { count: outcome.results }));
    else if (outcome?.state === "busy") toast.message(t("busy"));
    else if (outcome?.state === "fresh") toast.message(t("fresh"));
    else toast.success(common("saved"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => saveUciIdAction({ riderId, uciId })).then(
              (data) => data && report(data.read),
            );
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-label text-xs font-medium">
              {t("uciId")}
            </label>
            <Input
              id={inputId}
              value={uciId}
              inputMode="numeric"
              autoComplete="off"
              maxLength={24}
              placeholder="101 234 567 89"
              className="w-44 tabular-nums max-sm:h-11"
              onChange={(e) => setUciId(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending} className="max-sm:h-11">
            {common("save")}
          </Button>
        </form>
        <p className="text-meta text-xs leading-relaxed">{t("uciHint")}</p>

        {status.uciId && status.profileUrl && (
          <div className="flex flex-col gap-2">
            <a
              href={status.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-primary inline-flex w-fit items-center gap-1 text-sm underline-offset-2 hover:underline"
            >
              {t("profile")}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
            {!status.installationReads ? (
              <p className="text-meta text-xs">{t("off")}</p>
            ) : !status.reads ? (
              <p className="text-meta text-xs">{t("notThisRider")}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-meta text-xs">
                  {status.error
                    ? errorText(status.error)
                    : status.checkedAt
                      ? t("checked", { when: format(status.checkedAt, true) })
                      : t("notYet")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  className="max-sm:h-11"
                  onClick={() =>
                    void run(() => refreshRacesAction({ riderId })).then(
                      (outcome) => outcome && report(outcome),
                    )
                  }
                >
                  <RefreshCw data-icon="inline-start" />
                  {t("refresh")}
                </Button>
              </div>
            )}
          </div>
        )}

        {status.latest.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-medium">{t("latest")}</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {status.latest.map((r) => (
                <li key={r.resultUrl} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-meta w-20 shrink-0 text-xs tabular-nums">
                    {format(r.racedOn, false)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <a
                      href={r.resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring underline-offset-2 hover:underline"
                    >
                      {r.race}
                    </a>
                  </span>
                  <span className="text-meta text-xs">{r.raceClass}</span>
                  <span className="w-10 text-right tabular-nums">{placeText(r)}</span>
                </li>
              ))}
            </ul>
            <p className="text-meta text-xs">{t("coachOnly")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
