"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { registerPaymentAction, setPlanFreeAction, type BillingResult } from "@/core/admin/actions";
import { useRouter } from "@/i18n/navigation";
import { todayInCopenhagen } from "@/core/dates";
import { yearFrom } from "@/modules/billing/dates";

/**
 * A workspace's two actions under Installation → Betaling (docs/adr/0090),
 * for the installation's owner: "Registrér betaling" when a bank transfer
 * came in for an invoice, and "Sæt gratis" with a reason and, if it is for
 * a while, the last day. Both are checked again on the server and in the
 * database. Amounts in whole kroner; the VAT is suggested as a fifth of
 * the amount, which is 25 % VAT included, and can be changed.
 */

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function useSave(onDone: () => void) {
  const t = useTranslations("billing.admin");
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (action: () => Promise<BillingResult>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t(result.error === "invalid" ? "invalid" : "failed"));
        return;
      }
      toast.success(t("saved"));
      onDone();
      router.refresh();
    });
  return { pending, save };
}

export function BillingRowActions({ orgId, label }: { orgId: string; label: string }) {
  const t = useTranslations("billing.admin");
  const [open, setOpen] = useState<"pay" | "free" | null>(null);
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="outline" onClick={() => setOpen("pay")}>
        {t("register")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen("free")}>
        {t("makeFree")}
      </Button>
      <PaymentDialog
        orgId={orgId}
        label={label}
        open={open === "pay"}
        onOpenChange={(o) => setOpen(o ? "pay" : null)}
      />
      <FreeDialog
        orgId={orgId}
        label={label}
        open={open === "free"}
        onOpenChange={(o) => setOpen(o ? "free" : null)}
      />
    </div>
  );
}

type DialogProps = {
  orgId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PaymentDialog({ orgId, label, open, onOpenChange }: DialogProps) {
  const t = useTranslations("billing.admin");
  const common = useTranslations("common");
  const base = useId();
  const today = todayInCopenhagen();
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(yearFrom(today));
  const [note, setNote] = useState("");
  const { pending, save } = useSave(() => onOpenChange(false));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save(() =>
      registerPaymentAction({
        orgId,
        amountDkk: Number(amount),
        vatDkk: Number(vat),
        invoiceNo,
        periodFrom: from,
        periodTo: to,
        note: note.trim() || null,
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("registerTitle", { workspace: label })}</DialogTitle>
            <DialogDescription>{t("registerBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${base}-amount`} label={t("amount")}>
              <Input
                id={`${base}-amount`}
                inputMode="numeric"
                required
                pattern="[0-9]{1,8}"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 0) setVat(String(Math.round(n / 5)));
                }}
              />
            </Field>
            <Field id={`${base}-vat`} label={t("vat")}>
              <Input
                id={`${base}-vat`}
                inputMode="numeric"
                required
                pattern="[0-9]{1,8}"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
              />
            </Field>
            <Field id={`${base}-invoice`} label={t("invoiceNo")}>
              <Input
                id={`${base}-invoice`}
                required
                maxLength={100}
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
            </Field>
            <div />
            <Field id={`${base}-from`} label={t("from")}>
              <Input
                id={`${base}-from`}
                type="date"
                required
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (e.target.value) setTo(yearFrom(e.target.value));
                }}
              />
            </Field>
            <Field id={`${base}-to`} label={t("to")}>
              <Input
                id={`${base}-to`}
                type="date"
                required
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          <Field id={`${base}-note`} label={t("note")}>
            <Input
              id={`${base}-note`}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {common("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("registerSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FreeDialog({ orgId, label, open, onOpenChange }: DialogProps) {
  const t = useTranslations("billing.admin");
  const common = useTranslations("common");
  const base = useId();
  const [reason, setReason] = useState("");
  const [through, setThrough] = useState("");
  const { pending, save } = useSave(() => onOpenChange(false));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save(() => setPlanFreeAction({ orgId, reason, throughDay: through || null }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("freeTitle", { workspace: label })}</DialogTitle>
            <DialogDescription>{t("freeBody")}</DialogDescription>
          </DialogHeader>
          <Field id={`${base}-reason`} label={t("reason")}>
            <Input
              id={`${base}-reason`}
              required
              maxLength={60}
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Field id={`${base}-through`} label={t("through")}>
            <Input
              id={`${base}-through`}
              type="date"
              min={todayInCopenhagen()}
              value={through}
              onChange={(e) => setThrough(e.target.value)}
            />
          </Field>
          <p className="text-meta text-xs">{t("throughHelp")}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {common("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("freeSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
