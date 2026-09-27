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
import { createRiderAction } from "@/modules/team/actions";
import { RiderFields, type RiderDraft } from "./rider-fields";

/**
 * "Tilføj rytter": the rider's row now, the account when they are ready.
 * With an e-mail address the dialog makes an invitation link to copy —
 * Kadence sends no mail — and the rider lands on this row when they join.
 */
export function AddRiderDialog() {
  const t = useTranslations("riders.add");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const emailId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RiderDraft>({ name: "", birthYear: 0, sex: null });
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ url: string; email: string } | null>(null);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setDraft({ name: "", birthYear: 0, sex: null });
      setEmail("");
      setIssued(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const created = await run(
      () =>
        createRiderAction({
          name: draft.name.trim(),
          birthYear: draft.birthYear,
          sex: draft.sex,
          categoryOverride: null,
          email: email.trim(),
        }),
      { success: t("added", { name: draft.name.trim() }) },
    );
    if (!created) return;
    if (created.invitation)
      setIssued({ url: created.invitation.url, email: created.invitation.email });
    else reset(false);
  }

  return (
    <>
      <Button className="max-sm:h-11" onClick={() => setOpen(true)}>
        <UserPlus data-icon="inline-start" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-lg">
          {issued ? (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("issuedTitle")}</DialogTitle>
                <DialogDescription>{t("issuedBody")}</DialogDescription>
              </DialogHeader>
              <InvitationLink url={issued.url} email={issued.email} />
              <DialogFooter>
                <Button className="max-sm:h-11" onClick={() => reset(false)}>
                  {t("done")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("body")}</DialogDescription>
              </DialogHeader>
              <RiderFields value={draft} onChange={setDraft} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {t("email")} <span className="text-meta font-normal">({common("optional")})</span>
                </label>
                <Input
                  id={emailId}
                  type="email"
                  value={email}
                  maxLength={320}
                  autoComplete="off"
                  className="max-sm:h-11"
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-meta text-xs leading-relaxed">{t("emailHint")}</p>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || !draft.name.trim() || !draft.birthYear}
                  className="max-sm:h-11"
                >
                  {t("submit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="max-sm:h-11"
                  onClick={() => reset(false)}
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
