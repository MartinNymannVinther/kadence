import { CircleCheck, Circle, Mail, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type AccountState = "account" | "invited" | "expired" | "none";

/** Whether a rider has an account yet, as a tint, an icon and a word. */
export function AccountBadge({ state }: { state: AccountState }) {
  const t = useTranslations("riders.account");
  const Icon =
    state === "account"
      ? CircleCheck
      : state === "invited"
        ? Mail
        : state === "expired"
          ? CircleAlert
          : Circle;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium",
        state === "account" && "bg-success-tint text-success",
        state === "invited" && "bg-accent text-accent-foreground",
        state === "expired" && "bg-warning-tint text-destructive",
        state === "none" && "bg-muted text-meta",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {t(state)}
    </span>
  );
}

/** The state from the row and the team's open invitations. */
export function accountState(
  rider: { userId: string | null; invitationId: string | null },
  pending: Set<string>,
): AccountState {
  if (rider.userId) return "account";
  if (!rider.invitationId) return "none";
  return pending.has(rider.invitationId) ? "invited" : "expired";
}
