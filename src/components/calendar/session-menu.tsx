"use client";

import { useState } from "react";
import { CalendarClock, Copy, Ellipsis, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "./delete-dialog";
import { EditSessionSheet } from "./edit-session-sheet";
import { MoveDialog } from "./move-dialog";
import type { Scope } from "@/modules/training/vocabulary";
import type { CalendarCard, RiderOption } from "./types";

/**
 * What can be done to a planned session, behind one button: open it,
 * change it, move it to another day, copy it, delete it. Moving has a
 * date field here so it works on a phone, where dragging does not; a
 * session already done stays on its day.
 */
export function SessionMenu({
  session,
  riders,
  isCoach,
  openHref,
  onMoved,
  afterDeleteHref,
  className,
}: {
  session: CalendarCard;
  riders: RiderOption[];
  isCoach: boolean;
  openHref?: string;
  onMoved?: (onDate: string) => void;
  /** Where to go once the session is gone — away from its own page or panel. */
  afterDeleteHref?: string;
  className?: string;
}) {
  const t = useTranslations("calendar.menu");
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "move" | "copy" | "delete" | "edit">(null);
  const close = (open: boolean) => !open && setDialog(null);
  // What a change can reach: this copy, the group's copies that day (a
  // coach's), and this and the coming copies of a series (ADR 0041).
  const scopes: Scope[] = [
    "one",
    ...(isCoach && session.groupKey !== null ? (["group"] as const) : []),
    ...(session.seriesKey !== null ? (["series"] as const) : []),
  ];
  const done = session.activityId !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn("size-11 sm:size-7", className)}
              aria-label={t("label", { title: session.title })}
              title={t("label", { title: session.title })}
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {openHref && (
            <DropdownMenuItem onClick={() => router.push(openHref, { scroll: false })}>
              <ExternalLink />
              {t("open")}
            </DropdownMenuItem>
          )}
          {!done && (
            <DropdownMenuItem onClick={() => setDialog("edit")}>
              <Pencil />
              {t("edit")}
            </DropdownMenuItem>
          )}
          {!done && (
            <DropdownMenuItem onClick={() => setDialog("move")}>
              <CalendarClock />
              {t("move")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDialog("copy")}>
            <Copy />
            {t("copy")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(dialog === "move" || dialog === "copy") && (
        <MoveDialog
          open
          onOpenChange={close}
          mode={dialog}
          session={session}
          riders={isCoach ? riders : []}
          onMoved={onMoved}
        />
      )}
      {dialog === "delete" && (
        <DeleteDialog
          open
          onOpenChange={close}
          session={session}
          scopes={scopes}
          onDeleted={
            afterDeleteHref ? () => router.replace(afterDeleteHref, { scroll: false }) : undefined
          }
        />
      )}
      {dialog === "edit" && (
        <EditSessionSheet
          open
          onOpenChange={close}
          session={session}
          scopes={scopes}
          isCoach={isCoach}
        />
      )}
    </>
  );
}
