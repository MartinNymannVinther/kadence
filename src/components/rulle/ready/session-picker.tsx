"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { durationText } from "@/components/training/duration";
import { cn } from "@/lib/utils";
import type { Picked } from "./choices";

/**
 * Choosing what to ride (ADR 0035): today's planned sessions first, then
 * the team's own from the library, then DCU's — each of those with DCU's
 * words for when it belongs in a season — and a ride without a session.
 */
export function SessionPicker({
  open,
  onOpenChange,
  today,
  team,
  dcu,
  chosen,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: Picked[];
  team: Picked[];
  dcu: Picked[];
  chosen: string | null;
  onChoose: (id: string | null) => void;
}) {
  const t = useTranslations("rulle.session");
  const duration = useTranslations("training.duration");
  const choose = (id: string | null) => {
    onChoose(id);
    onOpenChange(false);
  };
  const row = (p: Picked) => (
    <Row
      key={p.id}
      chosen={chosen === p.id}
      title={p.title}
      meta={durationText(p.minutes, duration)}
      note={p.when ? t("when", { when: p.when }) : null}
      onClick={() => choose(p.id)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("pickTitle")}</DialogTitle>
          <DialogDescription>{t("pickBody")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {today.length > 0 && <Section title={t("today")}>{today.map(row)}</Section>}
          {team.length > 0 && <Section title={t("team")}>{team.map(row)}</Section>}
          <Section title={t("dcu")} note={t("dcuNote")}>
            {dcu.map(row)}
          </Section>
          <Section title={t("freeTitle")}>
            <Row
              chosen={chosen === null}
              title={t("free")}
              meta={t("freeMeta")}
              note={null}
              onClick={() => choose(null)}
            />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {note && <p className="text-meta text-xs leading-relaxed">{note}</p>}
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function Row({
  chosen,
  title,
  meta,
  note,
  onClick,
}: {
  chosen: boolean;
  title: string;
  meta: string;
  note: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onClick}
      className={cn(
        "focus-ring flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left",
        chosen ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-meta text-xs">
          {meta}
          {note && <> · {note}</>}
        </span>
      </span>
      {chosen && <Check aria-hidden className="text-primary size-4 shrink-0" />}
    </button>
  );
}
