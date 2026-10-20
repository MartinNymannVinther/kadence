"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addChampionAction, removeChampionAction } from "@/modules/club/actions";
import { CLUB_CLASSES, type ClubClass } from "@/modules/club/standings";

export type ChampionRow = {
  id: string;
  year: number;
  class: string;
  title: string;
  name: string;
  note: string;
};

/**
 * "Klubmestre gennem tiden" (ADR 0051): the roll of honour by year, from
 * Kadence's seasons and from before them. A coach adds a year by hand and
 * takes a line away again.
 */
export function HonourRoll({
  champions,
  isCoach,
  year,
}: {
  champions: ChampionRow[];
  isCoach: boolean;
  year: number;
}) {
  const t = useTranslations("club.honour");
  const { run, pending } = useRun();
  const [draft, setDraft] = useState({
    year: String(year - 1),
    class: "open" as ClubClass,
    title: t("defaultTitle"),
    name: "",
  });
  const years = [...new Set(champions.map((c) => c.year))];

  return (
    <div className="flex flex-col gap-3">
      {champions.length === 0 ? (
        <p className="text-meta text-2sm">{t("empty")}</p>
      ) : (
        <ol className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
          {years.map((y) => (
            <li key={y} className="grid gap-2 px-4 py-3 sm:grid-cols-[4rem_minmax(0,1fr)]">
              <span className="text-base font-semibold tabular-nums">{y}</span>
              <ul className="flex flex-col gap-1">
                {champions
                  .filter((c) => c.year === y)
                  .map((c) => (
                    <li key={c.id} className="flex items-baseline justify-between gap-3 text-2sm">
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-meta">
                          {" "}
                          · {c.title}, {t(`classes.${c.class}` as "empty")}
                        </span>
                        {c.note && <span className="text-meta"> · {c.note}</span>}
                      </span>
                      {isCoach && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("remove")}
                          disabled={pending}
                          onClick={() =>
                            run(() => removeChampionAction({ championId: c.id }), {
                              success: t("removed"),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {isCoach && (
        <form
          className="border-border flex flex-wrap items-end gap-2 rounded-xl border p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const done = await run(() => addChampionAction(draft), { success: t("added") });
            if (done !== null) setDraft({ ...draft, name: "" });
          }}
        >
          <Input
            aria-label={t("year")}
            className="w-20"
            inputMode="numeric"
            value={draft.year}
            onChange={(e) => setDraft({ ...draft, year: e.target.value })}
          />
          <NativeSelect
            aria-label={t("class")}
            variant="sm"
            className="w-28"
            value={draft.class}
            onChange={(e) => setDraft({ ...draft, class: e.target.value as ClubClass })}
          >
            {CLUB_CLASSES.map((c) => (
              <option key={c} value={c}>
                {t(`classes.${c}` as "empty")}
              </option>
            ))}
          </NativeSelect>
          <Input
            aria-label={t("title")}
            className="w-40"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            aria-label={t("name")}
            placeholder={t("name")}
            className="min-w-40 flex-1"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending || !draft.name.trim()}
          >
            <Plus data-icon="inline-start" />
            {t("add")}
          </Button>
        </form>
      )}
    </div>
  );
}
