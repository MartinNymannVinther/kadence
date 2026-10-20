"use client";

import { useLocale } from "next-intl";
import { addDaysIso } from "@/core/dates";
import { racePrepSession } from "@/modules/workouts/race-prep";
import { AddSessionSheet } from "./add-session-sheet";
import { CopyWeekDialog } from "./copy-week-dialog";
import { EventDialog } from "./event-dialog";
import { LogActivityDialog } from "./log-activity-dialog";
import type { TemplateOption } from "./template-picker";
import type { CalendarEventCard, RiderOption } from "./types";

/**
 * Which of the calendar's forms is open, and for what day and whom. The
 * week and the team grid each hold one of these, so a day's "+" and the
 * toolbar open the same form. A race offers its race prep: "Tilføj pas"
 * the day before, with the race prep built (docs/adr/0106).
 */
export type DialogState =
  | null
  | { kind: "session"; date: string; riderIds: string[]; racePrep?: boolean }
  | { kind: "event"; date: string; riderId: string | null; event?: CalendarEventCard }
  | { kind: "log"; date: string; riderId: string }
  | { kind: "copyWeek"; monday: string; riderIds: string[] };

export function CalendarDialogs({
  state,
  onClose,
  riders,
  templates,
  isCoach,
  onOpen,
}: {
  state: DialogState;
  onClose: () => void;
  /** Opens another of the forms in this one's place. */
  onOpen?: (next: DialogState) => void;
  riders: RiderOption[];
  templates: TemplateOption[];
  isCoach: boolean;
}) {
  const locale = useLocale();
  if (!state) return null;
  const close = (open: boolean) => !open && onClose();
  // A new key per opening, so every form starts from its defaults.
  const key = JSON.stringify(state);
  if (state.kind === "session") {
    return (
      <AddSessionSheet
        key={key}
        open
        onOpenChange={close}
        riders={riders}
        defaultRiderIds={state.riderIds}
        defaultDate={state.date}
        templates={templates}
        canBuild={isCoach}
        prefill={state.racePrep ? racePrepSession(locale) : undefined}
      />
    );
  }
  if (state.kind === "copyWeek") {
    return (
      <CopyWeekDialog
        key={key}
        open
        onOpenChange={close}
        monday={state.monday}
        riders={riders}
        defaultRiderIds={state.riderIds}
      />
    );
  }
  if (state.kind === "event") {
    // A race's own riders get its race prep; the team's race, the rider in view.
    const race = state.event?.kind === "race" ? state.event : null;
    return (
      <EventDialog
        key={key}
        open
        onOpenChange={close}
        event={state.event}
        defaultDate={state.date}
        defaultRiderId={state.riderId}
        riders={riders}
        isCoach={isCoach}
        onRacePrep={
          onOpen && isCoach && race
            ? () =>
                onOpen({
                  kind: "session",
                  date: addDaysIso(race.startsOn, -1),
                  riderIds: [race.riderId ?? state.riderId].filter((id) => id !== null),
                  racePrep: true,
                })
            : undefined
        }
      />
    );
  }
  return (
    <LogActivityDialog
      key={key}
      open
      onOpenChange={close}
      riderId={state.riderId}
      defaultDate={state.date}
    />
  );
}
