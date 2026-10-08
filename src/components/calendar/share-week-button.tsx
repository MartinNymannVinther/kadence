"use client";

import { Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { durationText } from "@/components/training/duration";
import { Button } from "@/components/ui/button";
import type { ShareEvent } from "@/modules/training/share-events";
import { shareWeekText, type ShareSession } from "@/modules/training/share-week";

/**
 * "Del ugen": the week as plain text for the club's SMS or chat group —
 * shared through the phone's own share sheet where there is one, copied
 * to the clipboard where there is not. The sessions with time, place,
 * title and length, and the team's races and camps with when, where and
 * who drives; nothing about how anyone is or did
 * (src/modules/training/share-week.ts).
 */
export function ShareWeekButton({
  team,
  monday,
  sessions,
  events,
  rider,
}: {
  team: string;
  monday: string;
  sessions: ShareSession[];
  events: ShareEvent[];
  /** A single rider's week: the rider's name, said once at the top. */
  rider?: string;
}) {
  const t = useTranslations("calendar.share");
  const duration = useTranslations("training.duration");
  const kinds = useTranslations("training.eventKind");
  const locale = useLocale();

  async function share() {
    const text = shareWeekText(
      { team, monday, sessions, events, rider, locale },
      {
        week: (n) => t("week", { n }),
        riders: (count) => t("riders", { count }),
        duration: (minutes) => durationText(minutes, duration),
        empty: t("empty"),
        events: {
          // "Holdmøde (andet)" says nothing; the other kinds are worth a word.
          kind: (kind) => (kind === "other" ? "" : kinds(kind as "race").toLocaleLowerCase(locale)),
          until: (day) => t("until", { day }),
          transport: (note) => t("transport", { note }),
        },
      },
    );
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("failed"));
    }
  }

  return (
    <Button type="button" variant="outline" className="max-sm:h-11" onClick={() => void share()}>
      <Share2 data-icon="inline-start" />
      {t("open")}
    </Button>
  );
}
