"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** What has been said in the dialogue: the coach, the AI, or a note from the panel itself. */
export type Spoken = { role: "coach" | "ai" | "note"; text: string; applied?: boolean };

/**
 * The conversation so far in "Byg med AI" for a programme (ai-dialog.tsx):
 * the coach's words to the right, the AI's to the left with a mark when
 * that answer was laid into the builder, and the panel's own notes in
 * between. Scrolls to the newest on its own, and reads as a log to a
 * screen reader.
 */
export function AiTranscript({ spoken, busy }: { spoken: Spoken[]; busy: boolean }) {
  const t = useTranslations("exercises.builder.ai");
  const end = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [spoken.length, busy]);

  return (
    <div role="log" aria-live="polite" className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {spoken.map((s, i) =>
        s.role === "note" ? (
          <p key={i} className="text-meta self-center text-xs">
            {s.text}
          </p>
        ) : (
          <div
            key={i}
            className={cn(
              "flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2 text-2sm leading-relaxed",
              s.role === "coach"
                ? "bg-primary/10 self-end"
                : "bg-card border-border self-start border",
            )}
          >
            <span className="text-label text-2xs font-medium">
              {t(s.role === "coach" ? "you" : "ai")}
            </span>
            <span className="whitespace-pre-line">{s.text}</span>
            {s.applied && (
              <span className="text-primary flex items-center gap-1 text-xs font-medium">
                <Check aria-hidden className="size-3.5" />
                {t("applied")}
              </span>
            )}
          </div>
        ),
      )}
      {busy && (
        <p className="text-meta self-start text-2sm" role="status">
          {t("sending")}
        </p>
      )}
      <div ref={end} />
    </div>
  );
}
