"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  addFamilyEventAction,
  deleteFamilyEventAction,
  updateFamilyEventAction,
} from "@/modules/training/family-actions";
import { FAMILY_KINDS, type FamilyEvent } from "@/modules/training/family-kinds";

/**
 * "Tilføj til kalenderen" for a parent (docs/adr/0069): a holiday, an
 * exam or something else the coach should plan around, from a day to a
 * day, in one child's calendar. A parent changes and deletes only what
 * they put in themselves; the dialog says that the child and the coach
 * see it, and that the child may delete it.
 */
export function FamilyEventDialog({
  open,
  onOpenChange,
  riderId,
  childName,
  event,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string;
  childName: string;
  /** The parent's own entry to change; a new one when absent. */
  event?: FamilyEvent;
  today: string;
}) {
  const t = useTranslations("parents.family");
  const kinds = useTranslations("training.eventKind");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const [kind, setKind] = useState<FamilyEvent["kind"]>(event?.kind ?? "holiday");
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsOn, setStartsOn] = useState(event?.startsOn ?? today);
  const [endsOn, setEndsOn] = useState(event?.endsOn ?? today);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      riderId,
      kind,
      title: title.trim() || kinds(kind),
      startsOn,
      endsOn: endsOn < startsOn ? startsOn : endsOn,
    };
    const done = event
      ? await run(() => updateFamilyEventAction({ eventId: event.id, event: input }), {
          success: common("saved"),
        })
      : await run(() => addFamilyEventAction(input), { success: common("saved") });
    if (done !== null) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {event ? t("editTitle", { name: childName }) : t("addTitle", { name: childName })}
            </DialogTitle>
            <DialogDescription>{t("dialogBody", { name: childName })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${base}-kind`} className="text-sm font-medium">
                {t("kind")}
              </label>
              <NativeSelect
                id={`${base}-kind`}
                value={kind}
                className="max-sm:h-11"
                onChange={(e) => setKind(e.target.value as FamilyEvent["kind"])}
              >
                {FAMILY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kinds(k)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${base}-title`} className="text-sm font-medium">
                {t("titleLabel")}
              </label>
              <Input
                id={`${base}-title`}
                value={title}
                maxLength={120}
                placeholder={t("titlePlaceholder")}
                className="max-sm:h-11"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${base}-from`} className="text-sm font-medium">
                {t("from")}
              </label>
              <Input
                id={`${base}-from`}
                type="date"
                required
                value={startsOn}
                className="max-sm:h-11"
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${base}-to`} className="text-sm font-medium">
                {t("to")}
              </label>
              <Input
                id={`${base}-to`}
                type="date"
                required
                min={startsOn}
                value={endsOn}
                className="max-sm:h-11"
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row-reverse">
              <Button type="submit" disabled={pending} className="max-sm:h-11">
                {common("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="max-sm:h-11"
                onClick={() => onOpenChange(false)}
              >
                {common("cancel")}
              </Button>
            </div>
            {event && (
              <ConfirmButton
                title={t("deleteTitle")}
                body={t("deleteBody", { name: childName })}
                confirmLabel={common("delete")}
                variant="ghost"
                onConfirm={async () => {
                  const done = await run(() => deleteFamilyEventAction({ eventId: event.id }));
                  if (done !== null) onOpenChange(false);
                }}
              >
                {common("delete")}
              </ConfirmButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
