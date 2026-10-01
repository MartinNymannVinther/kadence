"use client";

import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveUciIdAction } from "@/modules/results/actions";

/**
 * The rider's own UCI ID, in their own corner (ADR 0039): the number from
 * the licence, their page at Cykling Danmark, and plainly who sees what —
 * the races go in their calendar, the places are for their coaches.
 */
export function OwnRacesCard({
  riderId,
  printed,
  profileUrl,
  reads,
}: {
  riderId: string;
  /** The UCI ID as the licence prints it, if one is set. */
  printed: string | null;
  profileUrl: string | null;
  /** Whether this installation reads the rider's races. */
  reads: boolean;
}) {
  const t = useTranslations("settings.me.races");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const inputId = useId();
  const [uciId, setUciId] = useState(printed ?? "");

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
            void run(() => saveUciIdAction({ riderId, uciId })).then((data) => {
              if (!data) return;
              if (data.read?.state === "read")
                toast.success(t("read", { count: data.read.newRaces }));
              else if (data.read?.state === "failed") toast.error(t("failed"));
              else toast.success(common("saved"));
            });
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
        <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
        {printed && profileUrl && (
          <div className="flex flex-col gap-1.5">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-primary inline-flex w-fit items-center gap-1 text-sm underline-offset-2 hover:underline"
            >
              {t("profile")}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
            <p className="text-meta text-xs">{reads ? t("reads") : t("off")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
