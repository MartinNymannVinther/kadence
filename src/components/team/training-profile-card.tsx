"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SENIOR_PROFILE, type SeniorProfile } from "@/modules/paradigms";
import { setTrainingProfileAction } from "@/modules/team/actions";

const CHOICES: Array<{ value: SeniorProfile; label: "motionist" | "superMotionist" }> = [
  { value: "motionist", label: "motionist" },
  { value: "super-motionist", label: "superMotionist" },
];

/**
 * A senior's training profile (docs/adr/0091): Motionist or
 * Supermotionist, each in two sentences, Kadence's own numbers where DCU
 * has none. Shown only while the rider's class is senior; the coach sets
 * it on the rider's page and the rider on their own. Without a choice the
 * rider plans as a motionist, and the card says that is a default.
 */
export function TrainingProfileCard({
  riderId,
  profile,
}: {
  riderId: string;
  /** The stored choice; null is the default, motionist. */
  profile: SeniorProfile | null;
}) {
  const t = useTranslations("riders.trainingProfile");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const name = useId();
  const [chosen, setChosen] = useState<SeniorProfile>(profile ?? DEFAULT_SENIOR_PROFILE);

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
            void run(() => setTrainingProfileAction({ riderId, profile: chosen }), {
              success: t("saved"),
            });
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">{t("legend")}</legend>
            {CHOICES.map((choice) => (
              <label
                key={choice.value}
                className="border-border has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 has-focus-visible:outline-2"
              >
                <input
                  type="radio"
                  name={name}
                  value={choice.value}
                  checked={chosen === choice.value}
                  onChange={() => setChosen(choice.value)}
                  className="accent-primary mt-1"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{t(choice.label)}</span>
                  <span className="text-meta text-2sm leading-relaxed">
                    {t(`${choice.label}Body`)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {profile === null && <p className="text-meta text-xs leading-relaxed">{t("default")}</p>}
          <p className="text-meta text-xs leading-relaxed">{t("seasonNote")}</p>
          <Button type="submit" disabled={pending} className="self-start max-sm:h-11">
            {common("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
