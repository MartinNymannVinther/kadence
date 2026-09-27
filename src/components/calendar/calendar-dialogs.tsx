"use client";

import { AddSessionSheet } from "./add-session-sheet";
import { EventDialog } from "./event-dialog";
import { LogActivityDialog } from "./log-activity-dialog";
import type { TemplateOption } from "./template-picker";
import type { CalendarEventCard, RiderOption } from "./types";

/**
 * Which of the calendar's forms is open, and for what day and whom. The
 * week and the team grid each hold one of these, so a day's "+" and the
 * toolbar open the same form.
 */
export type DialogState =
  | null
  | { kind: "session"; date: string; riderIds: string[] }
  | { kind: "event"; date: string; riderId: string | null; event?: CalendarEventCard }
  | { kind: "log"; date: string; riderId: string };

export function CalendarDialogs({
  state,
  onClose,
  riders,
  templates,
  isCoach,
}: {
  state: DialogState;
  onClose: () => void;
  riders: RiderOption[];
  templates: TemplateOption[];
  isCoach: boolean;
}) {
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
      />
    );
  }
  if (state.kind === "event") {
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
