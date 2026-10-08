"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { leaveWorkspaceAction } from "@/core/team/actions";
import { useRouter } from "@/i18n/navigation";

/**
 * The way off a team: one question, then `leaveWorkspaceAction`, and the
 * person lands on onboarding with the team gone from their list.
 *
 * It stands in two places with the same action and the same question,
 * in each place's words: on the workspace page for a coach who is not the
 * owner, and at the bottom of Mig for everybody who is not a coach — a
 * rider, a parent — who no longer sees the workspace tab (ADR 0061,
 * `leavesFromMe`). The owner sees it nowhere: the team cannot be left
 * without one.
 */
export function LeaveTeamButton({ place }: { place: "workspace" | "me" }) {
  const members = useTranslations("settings.members");
  const me = useTranslations("settings.me.leave");
  const router = useRouter();
  const words =
    place === "workspace"
      ? {
          label: members("leave"),
          title: members("leaveTitle"),
          body: members("leaveBody"),
          confirm: members("leaveConfirm"),
        }
      : { label: me("action"), title: me("title"), body: me("body"), confirm: me("confirm") };

  return (
    <ConfirmButton
      title={words.title}
      body={words.body}
      confirmLabel={words.confirm}
      onConfirm={async () => {
        const result = await leaveWorkspaceAction();
        if (result.ok) {
          router.push("/onboarding");
          router.refresh();
        } else toast.error(members("errors.generic"));
      }}
      variant="outline"
      size="sm"
    >
      {words.label}
    </ConfirmButton>
  );
}
