"use client";

import { useId, useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { InvitationLink } from "@/components/common/invitation-link";
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
import { NativeSelect } from "@/components/ui/native-select";
import { addGuardianAction } from "@/modules/team/actions";
import type { LinkableMember } from "@/modules/team/member-guardians";
import { GuardianModeSwitch, LinkMemberForm, type GuardianMode } from "./link-member-form";

const RELATIONS = ["mother", "father", "guardian", "other"] as const;

/**
 * "Tilføj forælder": a parent's link to this rider, with an invitation to
 * copy — or, for a parent already on the team, their account linked
 * directly (link-member-form.tsx, backlog P2-16). The link shows the
 * parent nothing until the rider has said yes to it (ADR 0011) — the
 * dialog says so, so nobody is surprised.
 */
export function AddGuardianDialog({
  riderId,
  riderName,
  members,
}: {
  riderId: string;
  riderName: string;
  /** The team's members who could be this rider's parent too. */
  members: LinkableMember[];
}) {
  const t = useTranslations("riders.addGuardian");
  const relations = useTranslations("riders.relation");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("mother");
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ url: string; email: string } | null>(null);
  const [mode, setMode] = useState<GuardianMode>("new");
  const switcher =
    members.length > 0 ? <GuardianModeSwitch mode={mode} onChange={setMode} /> : null;

  function toggle(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setEmail("");
      setIssued(null);
      setMode("new");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const added = await run(
      () => addGuardianAction({ riderId, name: name.trim(), relation, email: email.trim() }),
      { success: t("added") },
    );
    if (!added) return;
    if (added.invitation) setIssued({ url: added.invitation.url, email: added.invitation.email });
    else toggle(false);
  }

  return (
    <>
      <Button variant="outline" className="max-sm:h-11" onClick={() => setOpen(true)}>
        <UserPlus data-icon="inline-start" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={toggle}>
        <DialogContent>
          {issued ? (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("issuedTitle")}</DialogTitle>
                <DialogDescription>{t("issuedBody", { rider: riderName })}</DialogDescription>
              </DialogHeader>
              <InvitationLink url={issued.url} email={issued.email} />
              <DialogFooter>
                <Button className="max-sm:h-11" onClick={() => toggle(false)}>
                  {t("done")}
                </Button>
              </DialogFooter>
            </div>
          ) : mode === "member" ? (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("body", { rider: riderName })}</DialogDescription>
              </DialogHeader>
              <LinkMemberForm
                riderId={riderId}
                riderName={riderName}
                members={members}
                switcher={switcher}
                onClose={() => toggle(false)}
              />
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("body", { rider: riderName })}</DialogDescription>
              </DialogHeader>
              {switcher}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${base}-name`} className="text-sm font-medium">
                    {t("name")}
                  </label>
                  <Input
                    id={`${base}-name`}
                    required
                    maxLength={120}
                    value={name}
                    className="max-sm:h-11"
                    onChange={(e) => setName(e.target.value)}
                  />
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
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${base}-email`} className="text-sm font-medium">
                  {t("email")} <span className="text-meta font-normal">({common("optional")})</span>
                </label>
                <Input
                  id={`${base}-email`}
                  type="email"
                  maxLength={320}
                  value={email}
                  className="max-sm:h-11"
                  onChange={(e) => setEmail(e.target.value)}
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
                  onClick={() => toggle(false)}
                >
                  {common("cancel")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
