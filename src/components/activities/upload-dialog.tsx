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
 * week's rider. While a Strava archive's run is under way the dialog stays
 * open — Escape, the backdrop and the close button do nothing, and Stop
 * is the way out — so the run is never left going with nobody seeing it.
 */
export function UploadDialog({ riderId }: { riderId: string }) {
  const t = useTranslations("activities.upload");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="outline" className="max-sm:h-11" onClick={() => setOpen(true)}>
        <Upload data-icon="inline-start" />
        {t("title")}
      </Button>
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
