"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { eraseRiderAction } from "@/modules/team/actions";

/**
 * A rider's right to erasure (GDPR art. 17): the rider, everything about
 * them and the audit trail's copies, gone for good (drizzle/0006
 * `erase_rider`). Unlike archiving it cannot be undone, so the coach types
 * the rider's name to say they mean it.
 */
export function EraseRider({ riderId, name }: { riderId: string; name: string }) {
  const t = useTranslations("riders.erase");
  const common = useTranslations("common");
  const router = useRouter();
  const { run, pending } = useRun();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLocaleLowerCase("da") === name.trim().toLocaleLowerCase("da");

  async function erase() {
    const done = await run(() => eraseRiderAction({ riderId, confirm: true }), {
      success: t("done", { name }),
      refresh: false,
    });
    if (done !== null) {
      setOpen(false);
      router.replace("/riders");
    }
  }

  return (
    <section
      aria-labelledby="danger-zone"
      className="border-destructive/40 flex flex-col items-start gap-2 rounded-xl border border-dashed p-4"
    >
      <h2 id="danger-zone" className="text-destructive text-sm font-semibold">
        {t("title")}
      </h2>
      <p className="text-2sm leading-relaxed">{t("body")}</p>
      <p className="text-meta text-xs leading-relaxed">{t("versusArchive")}</p>
      <Button variant="destructive" className="max-sm:h-11" onClick={() => setOpen(true)}>
        <Trash2 data-icon="inline-start" />
        {t("button")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmTitle", { name })}</DialogTitle>
            <DialogDescription>{t("confirmBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
              {t("typeName", { name })}
            </label>
            <Input
              id={id}
              value={typed}
              autoComplete="off"
              className="max-sm:h-11"
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={!matches || pending}
              onClick={() => void erase()}
            >
              {t("confirm")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {common("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
