"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { installDcuProgrammesAction } from "@/modules/training/dcu-actions";

/**
 * "Hent DCU's styrkeprogrammer": DCU's (Team Danmark's) strength
 * programmes into the library as read-only templates with their
 * progression (ADR 0014). Fetching again brings them up to the edition in
 * Kadence rather than adding copies.
 */
export function InstallDcuButton() {
  const t = useTranslations("library.dcu");
  const { run, pending } = useRun();
  return (
    <Button
      variant="outline"
      className="max-sm:h-11"
      disabled={pending}
      onClick={async () => {
        const result = await run(() => installDcuProgrammesAction({}));
        if (result) {
          toast.success(t("done", { installed: result.installed, updated: result.updated }));
        }
      }}
    >
      <Download data-icon="inline-start" />
      {t("install")}
    </Button>
  );
}
