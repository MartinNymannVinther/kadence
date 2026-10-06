"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { saveTeamSettingsAction } from "@/modules/team/actions";
import type { TeamSettings } from "@/modules/team/settings";
import { SwitchRow } from "./switch-row";

const KINDS = ["U17", "U19", "U23", "mixed"] as const;

/**
 * The team's own settings, one save: what kind of team it is, its
 * training basis — one choice, whether to follow DCU's recommendations
 * (on, ADR 0049), with "Lav intensitet først" as a profile on top of
 * either answer (off, ADR 0053) — whether weight may be recorded for
 * riders under 19 (off, ADR 0013), and whether the AI may read the
 * riders' data (off). The club championship's switch is there only where
 * the installation has the championship on (ADR 0056).
 */
export function TeamSettingsForm({
  settings,
  canManage,
  clubChampionship,
}: {
  settings: TeamSettings;
  canManage: boolean;
  /** Whether the installation offers the club championship (`featureOn`, read by the page). */
  clubChampionship: boolean;
}) {
  const t = useTranslations("settings.team");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const kindId = useId();
  const [draft, setDraft] = useState(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <form
      className="flex max-w-2xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => saveTeamSettingsAction(draft), { success: common("saved") });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
        {!canManage && <p className="text-meta text-2sm">{t("coachOnly")}</p>}
      </div>
      <fieldset disabled={!canManage} className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("kindTitle")}</CardTitle>
            <CardDescription>{t("kindBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <label htmlFor={kindId} className="sr-only">
              {t("kindTitle")}
            </label>
            <NativeSelect
              id={kindId}
              value={draft.teamKind}
              className="max-w-xs max-sm:h-11"
              onChange={(e) =>
                setDraft({ ...draft, teamKind: e.target.value as TeamSettings["teamKind"] })
              }
            >
              {KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`kinds.${kind}`)}
                </option>
              ))}
            </NativeSelect>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("guidanceTitle")}</CardTitle>
            <CardDescription>{t("guidanceBody")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <SwitchRow
              label={t("guidance")}
              hint={t("guidanceHint")}
              checked={draft.guidance === "dcu-2025"}
              stateText={draft.guidance === "dcu-2025" ? t("on") : t("off")}
              onChange={(on) => setDraft({ ...draft, guidance: on ? "dcu-2025" : "none" })}
            />
            {/* A profile on top of the hours, DCU's or the team's own: secondary, so set in. */}
            <div className="border-hairline ml-1 border-l-2 pl-4">
              <SwitchRow
                label={t("lowIntensity")}
                hint={t("lowIntensityHint")}
                checked={draft.lowIntensityFirst}
                stateText={draft.lowIntensityFirst ? t("on") : t("off")}
                onChange={(lowIntensityFirst) => setDraft({ ...draft, lowIntensityFirst })}
              />
            </div>
          </CardContent>
        </Card>
        {clubChampionship && (
          <Card>
            <CardHeader>
              <CardTitle>{t("clubTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SwitchRow
                label={t("club")}
                hint={t("clubHint")}
                checked={draft.clubChampionship}
                stateText={draft.clubChampionship ? t("on") : t("off")}
                onChange={(clubChampionship) => setDraft({ ...draft, clubChampionship })}
              />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t("youthTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-hairline flex flex-col divide-y">
            <SwitchRow
              label={t("weight")}
              hint={t("weightHint")}
              checked={draft.allowYouthWeight}
              stateText={draft.allowYouthWeight ? t("on") : t("off")}
              onChange={(allowYouthWeight) => setDraft({ ...draft, allowYouthWeight })}
            />
            <SwitchRow
              label={t("ai")}
              hint={t("aiHint")}
              checked={draft.aiOnRiderData}
              stateText={draft.aiOnRiderData ? t("on") : t("off")}
              onChange={(aiOnRiderData) => setDraft({ ...draft, aiOnRiderData })}
            />
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending || !dirty} className="self-start max-sm:h-11">
          {common("save")}
        </Button>
      </fieldset>
    </form>
  );
}
