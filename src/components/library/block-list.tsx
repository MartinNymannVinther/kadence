"use client";

import { useState } from "react";
import { Layers, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RiderOption } from "@/components/calendar/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ApplyBlockDialog } from "./apply-block-dialog";

export type BlockCard = {
  id: string;
  name: string;
  description: string;
  weeks: number;
  sessions: number;
  bikeHours: number;
};

/** The team's blocks: name, weeks, what they hold; a coach edits or applies one. */
export function BlockList({
  blocks,
  riders,
  isCoach,
  today,
}: {
  blocks: BlockCard[];
  riders: RiderOption[];
  isCoach: boolean;
  today: string;
}) {
  const t = useTranslations("library.blocks");
  const [applying, setApplying] = useState<BlockCard | null>(null);
  if (blocks.length === 0) return <p className="text-meta text-2sm">{t("empty")}</p>;
  return (
    <>
      <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
        {blocks.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Layers aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-meta text-xs">
                  {t("meta", {
                    weeks: b.weeks,
                    sessions: b.sessions,
                    hours: Math.round(b.bikeHours),
                  })}
                </p>
                {b.description && <p className="text-2sm mt-1 leading-relaxed">{b.description}</p>}
              </div>
            </div>
            {isCoach && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/library/blocks/${b.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-sm:h-11")}
                >
                  <Pencil data-icon="inline-start" />
                  {t("edit")}
                </Link>
                <Button
                  type="button"
                  size="sm"
                  className="max-sm:h-11"
                  onClick={() => setApplying(b)}
                >
                  {t("apply")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {applying && (
        <ApplyBlockDialog
          open
          onOpenChange={(o) => !o && setApplying(null)}
          block={applying}
          riders={riders}
          today={today}
        />
      )}
    </>
  );
}
