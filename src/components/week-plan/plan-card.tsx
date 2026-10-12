"use client";

import { ArrowRightLeft, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { timePlaceText } from "@/modules/training/time-place";
import { moveTargets } from "./move";
import { itemMinutes, itemSport, itemTitle, type PlanItem } from "./types";

/**
 * One session on a day of the plan: what it is, when and where, and what
 * can be done with it — edit, move to another day, remove. On a computer
 * the card can also be dragged to another day; "Flyt til" does the same
 * from a keyboard or a phone.
 */
export function PlanCard({
  item,
  dayLabel,
  dragging,
  dragProps,
  onEdit,
  onMove,
  onRemove,
}: {
  item: PlanItem;
  dayLabel: (day: number) => string;
  dragging: boolean;
  dragProps: React.HTMLAttributes<HTMLLIElement>;
  onEdit: () => void;
  onMove: (day: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("weekPlan.days");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const title = itemTitle(item);
  const minutes = itemMinutes(item);
  const when = timePlaceText(
    { startTime: item.startTime ?? null, meetingPlace: item.meetingPlace ?? "" },
    locale,
  );
  return (
    <li
      {...dragProps}
      className={cn(
        "bg-secondary/60 flex min-w-0 flex-col gap-0.5 rounded-lg px-2 pt-1.5 pb-0.5 motion-safe:transition-opacity",
        dragProps.draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-45",
      )}
    >
      <span className="flex min-w-0 items-start gap-1.5">
        <SportIcon sport={itemSport(item)} className="mt-0.5 size-3.5" />
        <span className="text-2sm min-w-0 leading-snug font-medium break-words">{title}</span>
      </span>
      {when && <span className="text-meta text-xs break-words">{when}</span>}
      <span className="flex items-center justify-between gap-1">
        <span className="text-meta text-xs tabular-nums">
          {minutes > 0 ? durationText(minutes, duration) : null}
        </span>
        <span className="flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-9 sm:size-7"
            aria-label={t("edit", { title })}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 sm:size-7"
                  aria-label={t("move", { title })}
                  title={t("move", { title })}
                />
              }
            >
              <ArrowRightLeft />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("moveTo")}</DropdownMenuLabel>
                {moveTargets(item.day).map((day) => (
                  <DropdownMenuItem key={day} onClick={() => onMove(day)}>
                    <span className="first-letter:uppercase">{dayLabel(day)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-9 sm:size-7"
            aria-label={t("remove", { title })}
            onClick={onRemove}
          >
            <X />
          </Button>
        </span>
      </span>
    </li>
  );
}
