"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setAiBudgetAction } from "@/core/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "7,50" or "7.50" as euro; empty is null; anything else is NaN. */
export function parseEuros(text: string): number | null {
  const trimmed = text.trim().replace(/\s|€/g, "").replace(",", ".");
  if (trimmed === "") return null;
  return /^\d+(\.\d{0,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/**
 * One workspace's monthly AI budget, set by the installation's owner
 * (docs/adr/0089). An empty field gives the workspace the installation's
 * default back; the placeholder says what that is.
 */
export function BudgetField({
  orgId,
  club,
  budgetMicro,
  defaultLabel,
}: {
  orgId: string;
  club: string;
  budgetMicro: number | null;
  defaultLabel: string;
}) {
  const t = useTranslations("settings.installation.aiMonth");
  const id = useId();
  const [value, setValue] = useState(
    budgetMicro === null ? "" : String(budgetMicro / 1_000_000).replace(".", ","),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "invalid" | "failed">("idle");
  const [pending, start] = useTransition();

  function save() {
    const euros = parseEuros(value);
    if (Number.isNaN(euros)) {
      setStatus("invalid");
      return;
    }
    start(async () => {
      const result = await setAiBudgetAction({ orgId, euros });
      setStatus(result.ok ? "saved" : result.error === "invalid" ? "invalid" : "failed");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="sr-only">
          {t("budgetLabel", { club })}
        </label>
        <Input
          id={id}
          inputMode="decimal"
          className="h-9 w-24 text-right tabular-nums"
          placeholder={defaultLabel}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus("idle");
          }}
        />
        <Button size="sm" variant="outline" disabled={pending} onClick={save}>
          {t("save")}
        </Button>
      </div>
      {status !== "idle" && (
        <p role="status" className="text-meta text-xs">
          {t(status)}
        </p>
      )}
    </div>
  );
}
