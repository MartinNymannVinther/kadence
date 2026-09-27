import { HeartHandshake, MessagesSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WellbeingStatus } from "@/modules/load";
import { cn } from "@/lib/utils";

/**
 * What the check-ins ask the adults to do, after Kolding Talent's
 * wellbeing model as Team Danmark's parents' guide presents it: yellow
 * for a while is a conversation within 14 days, red is professional
 * help. Said as an action with an icon, never as a colour alone.
 */
export function WellbeingAction({ status }: { status: WellbeingStatus | null }) {
  const t = useTranslations("insight.action");
  if (!status || status.action === "none") return null;
  const help = status.action === "help";
  const Icon = help ? HeartHandshake : MessagesSquare;
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-2sm font-semibold",
        help ? "bg-warning-tint text-destructive" : "bg-sticky text-sticky-ink",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {help ? t("help") : t("talk")}
    </p>
  );
}
