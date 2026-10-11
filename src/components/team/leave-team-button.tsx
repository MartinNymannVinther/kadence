"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChoiceRadios } from "@/components/access/choice-radios";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { leaveWithHistoryAction, leaveWorkspaceAction } from "@/core/team/actions";
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
 *
 * A rider is asked one thing more, "Tag din træning med?" (docs/adr/0081),
 * yes by default: then `leaveWithHistoryAction` moves their rows into a
 * personal workspace of their own before the team is left, and they land
 * there instead.
 */
export function LeaveTeamButton({
  place,
  history = false,
}: {
  place: "workspace" | "me";
  /** Whether the person is a rider here, with training that could go with them. */
  history?: boolean;
}) {
  const members = useTranslations("settings.members");
  const me = useTranslations("settings.me.leave");
  const router = useRouter();
  const [take, setTake] = useState<"yes" | "no">("yes");
  const words =
    place === "workspace"
      ? {
          label: members("leave"),
          title: members("leaveTitle"),
          body: members("leaveBody"),
          confirm: members("leaveConfirm"),
        }
      : { label: me("action"), title: me("title"), body: me("body"), confirm: me("confirm") };

  async function leave() {
    if (history && take === "yes") {
      const result = await leaveWithHistoryAction();
      if (!result.ok) return toast.error(members("errors.generic"));
      if (result.data.outcome === "left") {
        router.push("/today");
        router.refresh();
        return;
      }
      toast.error(
        me(result.data.outcome === "hasHistory" ? "history.hasHistory" : "history.failed"),
      );
      return;
    }
    const result = await leaveWorkspaceAction();
    if (result.ok) {
      router.push("/onboarding");
      router.refresh();
    } else toast.error(members("errors.generic"));
  }

  return (
    <ConfirmButton
      title={words.title}
      body={history ? me("bodyWithChoice") : words.body}
      details={
        history ? (
          <div className="flex flex-col gap-3">
            <ChoiceRadios
              legend={me("history.legend")}
              value={take}
              onChange={setTake}
              options={[
                { value: "yes", label: me("history.yes") },
                { value: "no", label: me("history.no") },
              ]}
            />
            <p className="text-meta text-2sm leading-relaxed">
              {take === "yes" ? me("history.body") : me("history.staysBody")}
            </p>
          </div>
        ) : undefined
      }
      confirmLabel={words.confirm}
      onConfirm={leave}
      variant="outline"
      size="sm"
    >
      {words.label}
    </ConfirmButton>
  );
}
