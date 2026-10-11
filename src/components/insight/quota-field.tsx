"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setFileQuotaAction } from "@/core/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseGigabytes } from "@/modules/storage/format";

/**
 * One workspace's file quota in gigabytes, set by the installation's owner
 * (docs/adr/0087). An empty field gives the workspace the installation's
 * default back; the placeholder says what that is.
 */
export function QuotaField({
  orgId,
  club,
  quotaBytes,
  defaultLabel,
}: {
  orgId: string;
  club: string;
  quotaBytes: number | null;
  defaultLabel: string;
}) {
  const t = useTranslations("settings.installation.fileQuota");
  const id = useId();
  const [value, setValue] = useState(
    quotaBytes === null ? "" : String(Math.round((quotaBytes / 1000 ** 3) * 10) / 10),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "invalid" | "failed">("idle");
  const [pending, start] = useTransition();

  function save() {
    const bytes = parseGigabytes(value);
    if (Number.isNaN(bytes)) {
      setStatus("invalid");
      return;
    }
    start(async () => {
      const result = await setFileQuotaAction({ orgId, bytes });
      setStatus(result.ok ? "saved" : result.error === "invalid" ? "invalid" : "failed");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="sr-only">
          {t("quotaLabel", { club })}
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
