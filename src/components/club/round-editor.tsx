"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { saveRoundEntriesAction } from "@/modules/club/actions";
import {
  CLUB_CLASSES,
  formatTime,
  parseTime,
  type ClubClass,
  type EntryIn,
  type EntryStatus,
  type RoundIn,
} from "@/modules/club/standings";

export type RiderChoice = { id: string; name: string; class: ClubClass };

type Row = {
  riderId: string | null;
  name: string;
  class: ClubClass;
  value: string;
  status: EntryStatus;
};

/**
 * A round's results as the coach types them: a rider from the team or a
 * guest by name, the class, the time ("mm:ss") or the place, and whether
 * they finished. Saved all at once; what was there is replaced.
 */
export function RoundEditor({
  round,
  riders,
}: {
  round: RoundIn & { entries: EntryIn[] };
  riders: RiderChoice[];
}) {
  const t = useTranslations("club.editor");
  const { run, pending } = useRun();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    round.entries.map((e) => ({
      riderId: e.riderId,
      name: e.name,
      class: e.class,
      value:
        round.measure === "time"
          ? e.timeMs !== null
            ? formatTime(e.timeMs)
            : ""
          : e.place !== null
            ? String(e.place)
            : "",
      status: e.status,
    })),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const time = round.measure === "time";
  const update = (i: number, row: Partial<Row>) =>
    setRows((all) => all.map((r, j) => (j === i ? { ...r, ...row } : r)));
  const unused = riders.filter((r) => !rows.some((row) => row.riderId === r.id));

  async function save() {
    const entries: Array<Omit<EntryIn, "id" | "roundId">> = [];
    for (const row of rows) {
      const finished = row.status === "finished";
      const timeMs = time && finished ? parseTime(row.value) : null;
      const place = !time && finished ? Number(row.value) : null;
      if (finished && (time ? timeMs === null : !Number.isInteger(place) || place! < 1)) {
        setProblem(t(time ? "badTime" : "badPlace", { name: row.name }));
        return;
      }
      entries.push({
        riderId: row.riderId,
        name: row.name.trim(),
        class: row.class,
        timeMs,
        place,
        status: row.status,
      });
    }
    setProblem(null);
    const done = await run(() => saveRoundEntriesAction({ roundId: round.id, entries }), {
      success: t("saved"),
    });
    if (done !== null) setOpen(false);
  }

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
    );

  return (
    <div className="border-border flex w-full flex-col gap-3 rounded-lg border p-3">
      <p className="text-meta text-xs">{t(time ? "hintTime" : "hintPlace")}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_7rem_auto] items-center gap-2"
          >
            {row.riderId ? (
              <span className="truncate text-2sm">{row.name}</span>
            ) : (
              <Input
                aria-label={t("name")}
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            )}
            <NativeSelect
              aria-label={t("class")}
              variant="sm"
              value={row.class}
              onChange={(e) => update(i, { class: e.target.value as ClubClass })}
            >
              {CLUB_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {t(`classes.${c}` as "name")}
                </option>
              ))}
            </NativeSelect>
            <Input
              aria-label={t(time ? "time" : "place")}
              inputMode={time ? "text" : "numeric"}
              placeholder={time ? "mm:ss" : "1"}
              value={row.value}
              disabled={row.status !== "finished"}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <NativeSelect
              aria-label={t("status")}
              variant="sm"
              value={row.status}
              onChange={(e) => update(i, { status: e.target.value as EntryStatus })}
            >
              {(["finished", "dnf", "dns"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}` as "name")}
                </option>
              ))}
            </NativeSelect>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("remove")}
              onClick={() => setRows((all) => all.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {unused.length > 0 && (
          <NativeSelect
            aria-label={t("addRider")}
            variant="sm"
            className="max-w-56"
            value=""
            onChange={(e) => {
              const rider = riders.find((r) => r.id === e.target.value);
              if (rider)
                setRows((all) => [
                  ...all,
                  {
                    riderId: rider.id,
                    name: rider.name,
                    class: rider.class,
                    value: "",
                    status: "finished",
                  },
                ]);
            }}
          >
            <option value="">{t("addRider")}</option>
            {unused.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setRows((all) => [
              ...all,
              { riderId: null, name: "", class: "open", value: "", status: "finished" },
            ])
          }
        >
          <Plus data-icon="inline-start" />
          {t("addGuest")}
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-destructive text-2sm">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || rows.some((r) => !r.name.trim())} onClick={save}>
          {t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
