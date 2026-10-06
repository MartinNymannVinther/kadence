"use client";

import { useId, useState } from "react";
import { Layers } from "lucide-react";
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
import { weekNumber } from "@/core/dates";
import { createBlockAction } from "@/modules/training/block-actions";
import { toBlockItem, type PlanItem } from "./types";

/**
 * "Gem som forløb" (ADR 0059): the planner's week kept in the library as
 * a block of one week, to start from again — "Start fra: Et forløb" — or
 * lay in from the library. The library's sessions are kept as the
 * library's; a session built here is kept in the block, not added to the
 * library. Nothing reaches a calendar.
 */
export function SaveAsBlock({ monday, items }: { monday: string; items: PlanItem[] }) {
  const t = useTranslations("weekPlan.save");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const nameId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        createBlockAction({
          name,
          description: "",
          weeks: 1,
          items: items.map(toBlockItem),
        }),
      { success: t("saved") },
    );
    if (done) setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={items.length === 0}
        className="self-start max-sm:h-11"
        onClick={() => {
          setName(t("defaultName", { n: weekNumber(monday) }));
          setOpen(true);
        }}
      >
        <Layers data-icon="inline-start" />
        {t("open")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={save} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("body")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-sm font-medium">
                {t("name")}
              </label>
              <Input
                id={nameId}
                value={name}
                required
                maxLength={80}
                className="max-sm:h-11"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending || !name.trim()} className="max-sm:h-11">
                {t("submit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="max-sm:h-11"
                onClick={() => setOpen(false)}
              >
                {common("cancel")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
