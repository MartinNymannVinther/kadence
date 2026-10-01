"use client";

import { useState } from "react";
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
import { deleteSessionAction } from "@/modules/training/actions";
import type { Scope } from "@/modules/training/vocabulary";

/**
 * Deleting a session — and, for a coach and a session laid on the whole
 * group, the choice of this rider's copy or every copy nobody has done
 * yet ("kun denne" / "hele gruppen"); for a session in a series, this one
 * and the coming ones nobody has done (ADR 0041).
 */
export function DeleteDialog({
  open,
  onOpenChange,
  session,
  scopes,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: { id: string; title: string };
  /** What the deletion may reach; one choice means no question. */
  scopes: Scope[];
  onDeleted?: () => void;
}) {
  const t = useTranslations("calendar.delete");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const [scope, setScope] = useState<Scope>("one");

  async function confirm() {
    const done = await run(() => deleteSessionAction({ sessionId: session.id, scope }), {
      success: t("deleted"),
    });
    if (done !== null) {
      onOpenChange(false);
      onDeleted?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title", { title: session.title })}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {scopes.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">{t("scope")}</legend>
            {scopes.map((value) => (
              <label
                key={value}
                className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <input
                  type="radio"
                  name="delete-scope"
                  className="accent-primary mt-1"
                  checked={scope === value}
                  onChange={() => setScope(value)}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{t(`scopes.${value}`)}</span>
                  <span className="text-meta text-xs">{t(`scopeHints.${value}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            className="max-sm:h-11"
            onClick={confirm}
          >
            {common("delete")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="max-sm:h-11"
            onClick={() => onOpenChange(false)}
          >
            {common("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
