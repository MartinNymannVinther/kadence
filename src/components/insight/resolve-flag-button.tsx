"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRun } from "@/components/common/use-run";
import { resolveFlagAction } from "@/modules/insight/resolution-actions";
import type { FlagKind } from "@/modules/load";

/**
 * "Afklaret": the coach has dealt with this flag for the week (ADR 0026).
 * The button sends the rider and the kind; the server decides the week,
 * the severity and what was seen. A refusal — the flag no longer fires —
 * is said in the reader's language.
 */
export function ResolveFlagButton({ riderId, kind }: { riderId: string; kind: FlagKind }) {
  const t = useTranslations("insight.resolve");
  const { run, pending } = useRun();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="self-start"
      disabled={pending}
      aria-label={t("label")}
      onClick={() => run(() => resolveFlagAction({ riderId, kind }), { success: t("done") })}
    >
      <Check data-icon="inline-start" />
      {t("button")}
    </Button>
  );
}
