import { CircleAlert, CircleCheck, Circle, Hourglass, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { GuardianState } from "./guardian-state";

/**
 * A parent link's state as a tint, an icon and a word. `label` says it
 * from another side — to the rider, "waiting for the rider" is "waiting
 * for you".
 */
export function GuardianBadge({ state, label }: { state: GuardianState; label?: string }) {
  const t = useTranslations("riders.guardianState");
  const Icon =
    state === "confirmed"
      ? CircleCheck
      : state === "waiting"
        ? Hourglass
        : state === "invited"
          ? Mail
          : state === "notInvited"
            ? Circle
            : CircleAlert;
  return (
    <span
      className={cn(
        "inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium",
        state === "confirmed" && "bg-success-tint text-success",
        (state === "waiting" || state === "invited") && "bg-accent text-accent-foreground",
        (state === "expired" || state === "lapsed") && "bg-warning-tint text-destructive",
        state === "notInvited" && "bg-muted text-meta",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {label ?? t(state)}
    </span>
  );
}
