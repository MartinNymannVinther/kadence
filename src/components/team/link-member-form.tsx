"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { linkMemberAsGuardianAction } from "@/modules/team/actions";
import type { LinkableMember } from "@/modules/team/member-guardians";

const RELATIONS = ["mother", "father", "guardian", "other"] as const;

export type GuardianMode = "new" | "member";

/** "En ny forælder" or "En, der er med på holdet": which of the two forms the dialog shows. */
export function GuardianModeSwitch({
  mode,
  onChange,
}: {
  mode: GuardianMode;
  onChange: (mode: GuardianMode) => void;
}) {
  const t = useTranslations("riders.addGuardian");
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">{t("who")}</legend>
      <div className="flex flex-wrap gap-2">
        {(["new", "member"] as const).map((value) => (
          <label
            key={value}
            className="border-border has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-focus-visible:outline-2"
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={mode === value}
              onChange={() => onChange(value)}
              className="accent-primary"
            />
            {t(value === "new" ? "modeNew" : "modeMember")}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A parent already on the team, linked to this rider too
 * (docs/backlog.md P2-16): pick the member and say who they are to the
 * rider. No invitation is made; the rider confirms the person, as always,
 * before the parent sees anything (ADR 0011). Each member is named with
 * what they already are on the team, so the right one is picked.
 */
export function LinkMemberForm({
  riderId,
  riderName,
  members,
  switcher,
  onClose,
}: {
  riderId: string;
  riderName: string;
  members: LinkableMember[];
  switcher: React.ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations("riders.addGuardian");
  const relations = useTranslations("riders.relation");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const [userId, setUserId] = useState(members[0]?.userId ?? "");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("mother");

  const described = (m: LinkableMember) => {
    const roles = [
      ...(m.parentOf.length > 0 ? [t("memberParentOf", { names: m.parentOf.join(", ") })] : []),
      ...(m.isCoach ? [t("memberCoach")] : []),
      ...(m.isRider ? [t("memberRider")] : []),
    ];
    return roles.length > 0 ? `${m.name} · ${roles.join(", ")}` : m.name;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const member = members.find((m) => m.userId === userId);
    if (!member) return;
    const linked = await run(() => linkMemberAsGuardianAction({ riderId, userId, relation }), {
      success: t("linked", { name: member.name, rider: riderName }),
    });
    if (linked) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {switcher}
      <p className="text-meta text-xs leading-relaxed">{t("memberBody", { rider: riderName })}</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${base}-member`} className="text-sm font-medium">
            {t("member")}
          </label>
          <NativeSelect
            id={`${base}-member`}
            value={userId}
            className="max-sm:h-11"
            onChange={(e) => setUserId(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {described(m)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${base}-rel`} className="text-sm font-medium">
            {t("relation")}
          </label>
          <NativeSelect
            id={`${base}-rel`}
            value={relation}
            className="max-sm:h-11"
            onChange={(e) => setRelation(e.target.value as (typeof RELATIONS)[number])}
          >
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {relations(r)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !userId} className="max-sm:h-11">
          {t("link")}
        </Button>
        <Button type="button" variant="ghost" className="max-sm:h-11" onClick={onClose}>
          {common("cancel")}
        </Button>
      </DialogFooter>
    </form>
  );
}
