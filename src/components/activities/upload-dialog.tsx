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

/** "Upload tur" in the calendar's toolbar: the upload in a dialog, for the week's rider. */
export function UploadDialog({ riderId }: { riderId: string }) {
  const t = useTranslations("activities.upload");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="max-sm:h-11" onClick={() => setOpen(true)}>
        <Upload data-icon="inline-start" />
        {t("title")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          <FitUpload riderId={riderId} compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
