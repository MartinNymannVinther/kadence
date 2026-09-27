"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useLanded } from "@/components/common/use-landed";
import { useRun } from "@/components/common/use-run";
import { dayLong } from "@/components/training/day-label";
import { moveSessionAction } from "@/modules/training/actions";
import type { CalendarCard } from "./types";

/**
 * The week's sessions as the page shows them while a move is on its way:
 * the card moves first and the server follows; if the server refuses, the
 * refresh puts it back. The moved card is marked where it landed, and a
 * screen reader is told where it went.
 */
export function useWeekSessions(initial: CalendarCard[]) {
  const t = useTranslations("calendar.week");
  const locale = useLocale();
  const { run } = useRun();
  const { landed, mark } = useLanded();
  const [sessions, setSessions] = useState(initial);
  const [announcement, setAnnouncement] = useState("");

  // A refresh from the server replaces the local list: state adjusted
  // while rendering, the way React asks for it, rather than in an effect.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setSessions(initial);
  }

  /** The card on its new day, here, before the server has answered. */
  function place(id: string, onDate: string) {
    const card = sessions.find((s) => s.id === id);
    if (!card) return;
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, onDate } : s)));
    mark(id);
    setAnnouncement(t("movedTo", { title: card.title, day: dayLong(onDate, locale) }));
  }

  async function move(id: string, onDate: string) {
    place(id, onDate);
    await run(() => moveSessionAction({ sessionId: id, onDate }));
  }

  return { sessions, move, place, landed, announcement };
}
