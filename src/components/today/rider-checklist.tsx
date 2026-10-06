"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { useStored } from "@/components/common/use-stored";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ProviderId } from "@/modules/devices/providers";
import { confirmGuardianAction } from "@/modules/team/actions";
import { DeviceStep } from "./checklist-device";
import { HomeScreenStep, usePlatform } from "./checklist-home";
import {
  checklistOpen,
  checklistSteps,
  currentStep,
  readMemory,
  type ChecklistMemory,
  type StepKey,
} from "./checklist-steps";

export type WaitingGuardian = { id: string; name: string; adult: boolean };

export type ChecklistFacts = {
  /** Whose checklist: the browser keeps one per person. */
  userId: string;
  thresholdsSet: boolean;
  guardians: WaitingGuardian[];
  configured: ProviderId[];
  connected: boolean;
  hasRides: boolean;
};

/**
 * "Kom i gang" on a rider's Today (docs/adr/0063): what they ride with,
 * their thresholds or "spring over", a yes to a parent who is waiting,
 * and Kadence on the home screen. Each step is done from what Kadence
 * knows where it can, and from what the rider said on this device where
 * it cannot; the next step is open, the rest is one line. "Skjul" puts
 * it away on this device. The server renders nothing: what was said lives
 * in the browser.
 */
export function RiderChecklist({ facts }: { facts: ChecklistFacts }) {
  const t = useTranslations("today.checklist");
  const [raw, setRaw] = useStored(`kadence.checklist.${facts.userId}`);
  const platform = usePlatform();
  const { run, pending } = useRun();

  if (raw === undefined || platform === null) return null;
  const memory = readMemory(raw);
  const remember = (patch: Partial<ChecklistMemory>) =>
    setRaw(JSON.stringify({ ...memory, ...patch }));

  const steps = checklistSteps({
    device: {
      choice: memory.choice,
      settled: memory.deviceSettled,
      connected: facts.connected,
      hasRides: facts.hasRides,
    },
    thresholds: { set: facts.thresholdsSet, skipped: memory.thresholdsSkipped },
    guardiansWaiting: facts.guardians.length,
    homeScreen: { installed: platform === "installed", settled: memory.homeSettled },
  });
  if (!checklistOpen(steps, memory.dismissed)) return null;
  const open = currentStep(steps);

  const body = (key: StepKey) => {
    switch (key) {
      case "device":
        return (
          <DeviceStep
            choice={memory.choice}
            configured={facts.configured}
            onChoose={(choice) => remember({ choice, deviceSettled: false })}
            onSettle={() => remember({ deviceSettled: true })}
          />
        );
      case "thresholds":
        return (
          <div className="flex flex-col gap-2">
            <p className="text-2sm leading-relaxed">{t("thresholds.body")}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/settings/me"
                className={cn(buttonVariants({ size: "sm" }), "max-sm:h-11")}
              >
                {t("thresholds.go")}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-sm:h-11"
                onClick={() => remember({ thresholdsSkipped: true })}
              >
                {t("thresholds.skip")}
              </Button>
            </div>
          </div>
        );
      case "guardian":
        return (
          <div className="flex flex-col gap-2">
            <p className="text-2sm leading-relaxed">{t("guardian.body")}</p>
            <div className="flex flex-wrap gap-2">
              {facts.guardians.map((g) => (
                <Button
                  key={g.id}
                  type="button"
                  size="sm"
                  className="max-sm:h-11"
                  disabled={pending}
                  onClick={() =>
                    run(() => confirmGuardianAction({ guardianId: g.id }), {
                      success: t("guardian.confirmed", { name: g.name }),
                    })
                  }
                >
                  {t("guardian.confirm", { name: g.name, adult: g.adult ? "yes" : "no" })}
                </Button>
              ))}
            </div>
            <p className="text-meta text-xs leading-relaxed">{t("guardian.where")}</p>
          </div>
        );
      case "homeScreen":
        return (
          <div className="flex flex-col gap-2">
            <HomeScreenStep platform={platform} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start max-sm:h-11"
              onClick={() => remember({ homeSettled: true })}
            >
              {t("homeScreen.done")}
            </Button>
          </div>
        );
    }
  };

  return (
    <section
      aria-labelledby="checklist-title"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="checklist-title" className="text-base font-semibold">
            {t("title")}
          </h2>
          <p className="text-meta text-2sm">
            {t("progress", {
              done: steps.filter((s) => s.done).length,
              total: steps.length,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-sm:h-11"
          onClick={() => remember({ dismissed: true })}
        >
          {t("hide")}
        </Button>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                step.done ? "bg-success-tint text-success" : "bg-accent text-accent-foreground",
              )}
            >
              {step.done ? <Check aria-hidden className="size-4" /> : i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <p className={cn("text-sm font-semibold", step.done && "text-meta font-medium")}>
                {t(`${step.key}.title` as "device.title")}
                {step.done && <span className="sr-only"> · {t("doneWord")}</span>}
              </p>
              {step.key === open && body(step.key)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
