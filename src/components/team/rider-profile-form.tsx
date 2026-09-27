"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { CLASS_BASES } from "@/modules/dcu";
import { updateRiderAction } from "@/modules/team/actions";
import { RiderFields, type RiderDraft } from "./rider-fields";

/**
 * The coach's edit of a rider: name, birth year, sex, and — when the birth
 * year's class is not the one to plan from — a class chosen by hand, such
 * as a second-year U17 moved up (ADR 0014: a deviation, shown).
 */
export function RiderProfileForm({
  rider,
  classByYear,
}: {
  rider: RiderDraft & { id: string; categoryOverride: string | null };
  /** The class the birth year gives, for the "automatic" option. */
  classByYear: string;
}) {
  const t = useTranslations("riders.profile");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const overrideId = useId();
  const [draft, setDraft] = useState<RiderDraft>({
    name: rider.name,
    birthYear: rider.birthYear,
    sex: rider.sex,
  });
  const [override, setOverride] = useState(rider.categoryOverride ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                updateRiderAction({
                  riderId: rider.id,
                  name: draft.name.trim(),
                  birthYear: draft.birthYear,
                  sex: draft.sex,
                  categoryOverride: override || null,
                }),
              { success: common("saved") },
            );
          }}
        >
          <RiderFields value={draft} onChange={setDraft} />
          <div className="flex max-w-sm flex-col gap-1.5">
            <label htmlFor={overrideId} className="text-sm font-medium">
              {t("class")}
            </label>
            <NativeSelect
              id={overrideId}
              value={override}
              className="max-sm:h-11"
              onChange={(e) => setOverride(e.target.value)}
            >
              <option value="">{t("classAuto", { class: classByYear })}</option>
              {[...CLASS_BASES, "senior"].map((basis) => (
                <option key={basis} value={basis}>
                  {basis === "senior" ? t("senior") : basis}
                </option>
              ))}
            </NativeSelect>
            <p className="text-meta text-xs leading-relaxed">{t("classHint")}</p>
          </div>
          <Button type="submit" disabled={pending} className="self-start max-sm:h-11">
            {common("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
