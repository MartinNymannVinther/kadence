"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { installKadenceContentAction } from "@/modules/training/kadence-actions";

/**
 * "Hent motionistpas": Kadence's own bike sessions, strength programmes
 * and ready weeks for an adult into the library (docs/adr/0092), shown
 * only where the workspace has a senior. Fetching again brings them up to
 * Kadence's edition rather than adding copies.
 */
export function InstallKadenceButton() {
  const t = useTranslations("library.kadence");
  const { run, pending } = useRun();
  return (
    <Button
      variant="outline"
      className="max-sm:h-11"
      disabled={pending}
      onClick={async () => {
        const result = await run(() => installKadenceContentAction({}));
        if (result)
          toast.success(t("done", { installed: result.installed, updated: result.updated }));
      }}
    >
      <Download data-icon="inline-start" />
      {t("install")}
    </Button>
  );
}
