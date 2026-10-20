"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FitUpload } from "./fit-upload";

/**
 * "Upload tur" in the calendar's toolbar: the upload in a dialog, for the
 * week's rider. `quiet` is the small link on a session that has no ride
 * yet (Today), the same dialog behind a quieter door. While a Strava archive's run is under way the dialog stays
 * open — Escape, the backdrop and the close button do nothing, and Stop
 * is the way out — so the run is never left going with nobody seeing it.
 */
export function UploadDialog({ riderId, quiet = false }: { riderId: string; quiet?: boolean }) {
  const t = useTranslations("activities.upload");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {quiet ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring text-meta hover:text-primary flex min-h-11 items-center gap-1.5 px-1 text-2sm font-medium hover:underline"
        >
          <Upload aria-hidden className="size-3.5" />
          {t("quiet")}
        </button>
      ) : (
        <Button variant="outline" className="max-sm:h-11" onClick={() => setOpen(true)}>
          <Upload data-icon="inline-start" />
          {t("title")}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next || !busy) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <FitUpload riderId={riderId} compact onBusy={setBusy} />
        </DialogContent>
      </Dialog>
    </>
  );
}
