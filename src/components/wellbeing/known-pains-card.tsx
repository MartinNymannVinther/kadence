"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  addKnownPainAction,
  changeKnownPainAction,
  removeKnownPainAction,
} from "@/modules/wellbeing/actions";
import { MAX_KNOWN_PAINS, MAX_PLACE_LENGTH } from "@/modules/load/usual-pain";
import type { KnownPainView } from "@/modules/wellbeing/known-pains";

const LEVELS = [1, 2] as const;

/**
 * "Kendte smerter" (docs/adr/0097): something that always hurts a little,
 * and how much it usually does on ATK's ladder — 1 or 2, never 3. The
 * rider keeps them on Mig, a coach on the rider's page, as with the
 * thresholds; the check-in offers each as "Ryg som det plejer", and a pain
 * ticked so does not colour the day.
 */
export function KnownPainsCard({
  riderId,
  pains,
  own,
}: {
  riderId: string;
  pains: KnownPainView[];
  /** The rider's own page, or a coach's page about the rider. */
  own: boolean;
}) {
  const t = useTranslations("knownPains");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const ids = { place: useId(), level: useId() };
  const [place, setPlace] = useState("");
  const [level, setLevel] = useState<number>(1);
  const full = pains.length >= MAX_KNOWN_PAINS;

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () => addKnownPainAction({ riderId, place: place.trim(), usualLevel: level }),
      { success: common("saved") },
    );
    if (done !== null) {
      setPlace("");
      setLevel(1);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t(own ? "body" : "bodyCoach")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pains.length === 0 ? (
          <p className="text-meta text-2sm">{t("empty")}</p>
        ) : (
          <ul className="divide-hairline flex flex-col divide-y text-2sm">
            {pains.map((pain) => (
              <li key={pain.id} className="flex min-h-11 flex-wrap items-center gap-3 py-1">
                <span className="min-w-0 flex-1 font-medium break-words">{pain.place}</span>
                <NativeSelect
                  aria-label={t("levelLabel", { place: pain.place })}
                  value={pain.usualLevel}
                  disabled={pending}
                  className="max-sm:h-11"
                  onChange={(e) =>
                    run(
                      () =>
                        changeKnownPainAction({
                          knownPainId: pain.id,
                          place: pain.place,
                          usualLevel: Number(e.target.value),
                        }),
                      { success: common("saved") },
                    )
                  }
                >
                  {LEVELS.map((n) => (
                    <option key={n} value={n}>
                      {n} · {t(`level.${n}`)}
                    </option>
                  ))}
                </NativeSelect>
                <ConfirmButton
                  title={t("removeTitle", { place: pain.place })}
                  body={t("removeBody")}
                  confirmLabel={common("delete")}
                  variant="ghost"
                  size="icon-lg"
                  onConfirm={() => run(() => removeKnownPainAction({ knownPainId: pain.id }))}
                >
                  <Trash2 aria-hidden />
                  <span className="sr-only">{t("remove", { place: pain.place })}</span>
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        {full ? (
          <p className="text-meta text-xs leading-relaxed">{t("full")}</p>
        ) : (
          <form
            onSubmit={add}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.place} className="text-label text-xs font-medium">
                {t("place")}
              </label>
              <Input
                id={ids.place}
                required
                maxLength={MAX_PLACE_LENGTH}
                value={place}
                placeholder={t("placePlaceholder")}
                className="max-sm:h-11"
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.level} className="text-label text-xs font-medium">
                {t("usual")}
              </label>
              <NativeSelect
                id={ids.level}
                value={level}
                className="max-sm:h-11"
                onChange={(e) => setLevel(Number(e.target.value))}
              >
                {LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n} · {t(`level.${n}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" disabled={pending || !place.trim()} className="max-sm:h-11">
              {t("add")}
            </Button>
          </form>
        )}
        <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
      </CardContent>
    </Card>
  );
}
