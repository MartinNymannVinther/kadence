"use client";

import { ChevronLeft, ChevronRight, SquareDashedMousePointer, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const TEXT = "sm:h-9 sm:px-3 sm:text-2sm";
const ICON = "sm:size-9";

/**
 * The zoom's controls under the curves: what the window is, in a live
 * region of its own that a hover never overwrites; the way back to the
 * whole ride, first and largest; the mode that lets a finger select a
 * stretch; and in, out, earlier and later. Two button rows, so a phone
 * wraps between them, never in the middle of one; every button stays
 * focusable while disabled, so a keyboard user is not dropped when
 * Earlier disables at the ride's start.
 */
export function ZoomToolbar({
  status,
  armed,
  onArm,
  canIn,
  canOut,
  canEarlier,
  canLater,
  onIn,
  onOut,
  onEarlier,
  onLater,
  onWhole,
}: {
  status: string;
  armed: boolean;
  onArm: (armed: boolean) => void;
  canIn: boolean;
  canOut: boolean;
  canEarlier: boolean;
  canLater: boolean;
  onIn: () => void;
  onOut: () => void;
  onEarlier: () => void;
  onLater: () => void;
  onWhole: () => void;
}) {
  const t = useTranslations("activities.streams");
  const icons = [
    { label: t("zoomOut"), Icon: ZoomOut, enabled: canOut, onClick: onOut },
    { label: t("zoomIn"), Icon: ZoomIn, enabled: canIn, onClick: onIn },
    { label: t("earlier"), Icon: ChevronLeft, enabled: canEarlier, onClick: onEarlier },
    { label: t("later"), Icon: ChevronRight, enabled: canLater, onClick: onLater },
  ];
  return (
    <div role="group" aria-label={t("zoomTools")} className="flex flex-wrap items-center gap-1.5">
      <output
        role="status"
        aria-label={t("window")}
        className="text-2sm flex min-h-6 basis-full items-center tabular-nums sm:mr-1 sm:basis-auto"
      >
        {status}
      </output>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="lg"
          className="sm:h-9 sm:px-4 sm:text-2sm"
          disabled={!canOut}
          focusableWhenDisabled
          onClick={onWhole}
        >
          {t("whole")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className={`${TEXT} aria-pressed:border-primary aria-pressed:bg-accent`}
          aria-pressed={armed}
          focusableWhenDisabled
          onClick={() => onArm(!armed)}
        >
          <SquareDashedMousePointer aria-hidden />
          {t("select")}
        </Button>
      </div>
      <div className="flex gap-1.5">
        {icons.map(({ label, Icon, enabled, onClick }) => (
          <Button
            key={label}
            variant="outline"
            size="icon-lg"
            className={ICON}
            aria-label={label}
            disabled={!enabled}
            focusableWhenDisabled
            onClick={onClick}
          >
            <Icon aria-hidden />
          </Button>
        ))}
      </div>
    </div>
  );
}
