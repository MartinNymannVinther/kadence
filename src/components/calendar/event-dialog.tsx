"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/modules/training/actions";
import { EventResults } from "./event-results";
import { RacePrepOffer } from "./race-prep-offer";
import { EventWhereFields, eventWhereDraft, eventWhereValue } from "./event-where-fields";
import type { CalendarEventCard, RiderOption } from "./types";

const KINDS = ["race", "exam", "school", "camp", "holiday", "ill", "other"] as const;
/** A holiday or a week ill has no hour and no meeting place. */
const WITHOUT_WHERE = new Set(["holiday", "ill"]);

/**
 * A race, an exam, school, a camp, a holiday or a week ill in the
 * calendar (ADR 0013). A rider puts in their own — an exam, a day ill; a
 * coach puts in anyone's, and the team's own days that everyone sees.
 * A race, a camp or an exam may say when and where it starts and who
 * drives (docs/backlog.md P2-03). An open race offers its race prep the
 * day before (docs/adr/0106).
 */
export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultRiderId,
  riders,
  isCoach,
  onRacePrep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The event to change; a new one when absent. */
  event?: CalendarEventCard;
  defaultDate: string;
  /** Whose calendar the dialog was opened in; null for the team's. */
  defaultRiderId: string | null;
  /** Who a coach may put it on; a rider's own is fixed. */
  riders: RiderOption[];
  isCoach: boolean;
  /** Opens the race prep the day before this race, in this dialog's place. */
  onRacePrep?: () => void;
}) {
  const t = useTranslations("calendar.event");
  const kinds = useTranslations("training.eventKind");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const ids = {
    kind: `${base}-kind`,
    title: `${base}-title`,
    from: `${base}-from`,
    to: `${base}-to`,
    who: `${base}-who`,
    note: `${base}-note`,
    prio: `${base}-prio`,
  };
  const [kind, setKind] = useState<string>(event?.kind ?? "race");
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsOn, setStartsOn] = useState(event?.startsOn ?? defaultDate);
  const [endsOn, setEndsOn] = useState(event?.endsOn ?? defaultDate);
  const [priority, setPriority] = useState(event?.priority ?? "");
  const [riderId, setRiderId] = useState<string | null>(event ? event.riderId : defaultRiderId);
  const [note, setNote] = useState(event?.note ?? "");
  const [where, setWhere] = useState(() => eventWhereDraft(event));
  const hasWhere = !WITHOUT_WHERE.has(kind);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      riderId,
      kind,
      title: title.trim() || kinds(kind as "race"),
      startsOn,
      endsOn: endsOn < startsOn ? startsOn : endsOn,
      priority: kind === "race" && priority ? priority : null,
      note: note.trim(),
      ...eventWhereValue(hasWhere ? where : eventWhereDraft()),
    };
    const done = event
      ? await run(() => updateEventAction({ eventId: event.id, event: input }), {
          success: common("saved"),
        })
      : await run(() => createEventAction(input), { success: common("saved") });
    if (done !== null) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{event ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          {event?.fromParent && <p className="text-meta -mt-2 text-xs">{t("fromParent")}</p>}
          {event && <EventResults event={event} riders={riders} />}
          {event && onRacePrep && <RacePrepOffer startsOn={event.startsOn} onPrep={onRacePrep} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.kind} className="text-sm font-medium">
                {t("kind")}
              </label>
              <NativeSelect
                id={ids.kind}
                value={kind}
                className="max-sm:h-11"
                onChange={(e) => setKind(e.target.value)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {kinds(k)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {kind === "race" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={ids.prio} className="text-sm font-medium">
                  {t("priority")}
                </label>
                <NativeSelect
                  id={ids.prio}
                  value={priority}
                  className="max-sm:h-11"
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">{common("none")}</option>
                  {(["A", "B", "C"] as const).map((p) => (
                    <option key={p} value={p}>
                      {t(`priorities.${p}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.title} className="text-sm font-medium">
              {t("title")}
            </label>
            <Input
              id={ids.title}
              value={title}
              maxLength={120}
              placeholder={t("titlePlaceholder")}
              className="max-sm:h-11"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.from} className="text-sm font-medium">
                {t("from")}
              </label>
              <Input
                id={ids.from}
                type="date"
                required
                value={startsOn}
                className="max-sm:h-11"
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.to} className="text-sm font-medium">
                {t("to")}
              </label>
              <Input
                id={ids.to}
                type="date"
                required
                min={startsOn}
                value={endsOn}
                className="max-sm:h-11"
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
          {hasWhere && <EventWhereFields value={where} onChange={setWhere} />}
          {isCoach ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.who} className="text-sm font-medium">
                {t("who")}
              </label>
              <NativeSelect
                id={ids.who}
                value={riderId ?? ""}
                className="max-sm:h-11"
                onChange={(e) => setRiderId(e.target.value || null)}
              >
                <option value="">{t("wholeTeam")}</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <p className="text-meta text-xs">{riderId ? t("onlyYou") : t("wholeTeam")}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.note} className="text-sm font-medium">
              {t("note")}
            </label>
            <Textarea
              id={ids.note}
              value={note}
              maxLength={2000}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row-reverse">
              <Button type="submit" disabled={pending} className="max-sm:h-11">
                {common("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="max-sm:h-11"
                onClick={() => onOpenChange(false)}
              >
                {common("cancel")}
              </Button>
            </div>
            {event && (
              <ConfirmButton
                title={t("deleteTitle")}
                body={t("deleteBody")}
                confirmLabel={common("delete")}
                variant="ghost"
                onConfirm={async () => {
                  const done = await run(() => deleteEventAction({ eventId: event.id }));
                  if (done !== null) onOpenChange(false);
                }}
              >
                {common("delete")}
              </ConfirmButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
