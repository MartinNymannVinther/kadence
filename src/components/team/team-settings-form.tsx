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
 * The team's own settings, one save: what kind of team it is, whether
 * weight may be recorded for riders under 19 (off, ADR 0013), and whether
 * the AI may read the riders' data (off; the AI arrives in wave 4).
 */
export function TeamSettingsForm({
  settings,
  canManage,
}: {
  settings: TeamSettings;
  canManage: boolean;
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
