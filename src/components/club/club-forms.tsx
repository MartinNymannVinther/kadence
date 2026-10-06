"use client";

import { useState } from "react";
import { Crown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useRouter } from "@/i18n/navigation";
import {
  addRoundAction,
  createChampionshipAction,
  crownChampionsAction,
} from "@/modules/club/actions";
import { ROUND_KINDS } from "@/modules/club/standings";

const field = "flex min-w-0 flex-col gap-1";
const label = "text-label text-xs font-medium";

/** The season's championship, named and started by a coach. */
export function NewChampionship({ year }: { year: number }) {
  const t = useTranslations("club.forms");
  const router = useRouter();
  const { run, pending } = useRun();
  const [season, setSeason] = useState(String(year));
  const [title, setTitle] = useState(t("defaultTitle", { year }));
  return (
    <form
      className="border-border bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const created = await run(() => createChampionshipAction({ season, title }), {
          success: t("created"),
          refresh: false,
        });
        if (created) router.push(`/club?c=${created.id}`);
      }}
    >
      <label className={field}>
        <span className={label}>{t("season")}</span>
        <Input
          value={season}
          inputMode="numeric"
          className="w-24"
          onChange={(e) => setSeason(e.target.value)}
        />
      </label>
      <label className={`${field} min-w-48 flex-1`}>
        <span className={label}>{t("title")}</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending || !title.trim()}>
        <Plus data-icon="inline-start" />
        {t("create")}
      </Button>
    </form>
  );
}

/** A round added to the championship: when, what kind, and how it is decided. */
export function NewRound({ championshipId, today }: { championshipId: string; today: string }) {
  const t = useTranslations("club.forms");
  const kinds = useTranslations("club.round.kind");
  const { run, pending } = useRun();
  const [heldOn, setHeldOn] = useState(today);
  const [kind, setKind] = useState<(typeof ROUND_KINDS)[number]>("tt");
  const [title, setTitle] = useState("");
  const [measure, setMeasure] = useState<"time" | "place">("time");
  return (
    <form
      className="border-border bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const done = await run(
          () => addRoundAction({ championshipId, heldOn, kind, title, measure }),
          { success: t("roundAdded") },
        );
        if (done !== null) setTitle("");
      }}
    >
      <label className={field}>
        <span className={label}>{t("date")}</span>
        <Input type="date" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} />
      </label>
      <label className={field}>
        <span className={label}>{t("kind")}</span>
        <NativeSelect
          variant="sm"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as typeof kind;
            setKind(next);
            setMeasure(next === "tt" || next === "hill" ? "time" : "place");
          }}
        >
          {ROUND_KINDS.map((k) => (
            <option key={k} value={k}>
              {kinds(k)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className={`${field} min-w-48 flex-1`}>
        <span className={label}>{t("roundTitle")}</span>
        <Input
          value={title}
          placeholder={t("roundTitleHint")}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className={field}>
        <span className={label}>{t("measure")}</span>
        <NativeSelect
          variant="sm"
          value={measure}
          onChange={(e) => setMeasure(e.target.value as typeof measure)}
        >
          <option value="time">{t("byTime")}</option>
          <option value="place">{t("byPlace")}</option>
        </NativeSelect>
      </label>
      <Button type="submit" variant="outline" disabled={pending || !title.trim()}>
        <Plus data-icon="inline-start" />
        {t("addRound")}
      </Button>
    </form>
  );
}

/** The season's winners into the roll of honour as club champions. */
export function CrownChampions({ championshipId }: { championshipId: string }) {
  const t = useTranslations("club.forms");
  const { run, pending } = useRun();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        run(() => crownChampionsAction({ championshipId, title: t("championTitle") }), {
          success: t("crowned"),
        })
      }
    >
      <Crown data-icon="inline-start" />
      {t("crown")}
    </Button>
  );
}
