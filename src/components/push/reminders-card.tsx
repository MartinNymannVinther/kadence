"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { SwitchRow } from "@/components/team/switch-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PushKind } from "@/core/db/schema/push";
import {
  reminderStateAction,
  setReminderKindsAction,
  subscribeRemindersAction,
  unsubscribeRemindersAction,
} from "@/modules/push/actions";
import {
  currentSubscription,
  permissionDenied,
  pushSupport,
  subscribeBrowser,
} from "./browser-push";
import { RemindersDiagnosis } from "./reminders-diagnosis";
import { TestReminder } from "./test-reminder";

type View = "loading" | "unsupported" | "ios" | "denied" | "off" | "on";

/**
 * "Påmindelser" under Settings → Mig (docs/adr/0060): reminders on this
 * browser, for this team. The page shows the card only when the
 * installation has the keys, and hands it the reminders the person's
 * roles offer; the choices are kept per browser, and turning off lets go
 * of the browser's address everywhere. "Send en prøve" and the status
 * line underneath are for finding out whether a real phone is set up.
 */
export function RemindersCard({
  publicKey,
  offered,
  coach,
}: {
  publicKey: string;
  offered: PushKind[];
  /** A coach hears from riders and parents; the hint says so. */
  coach: boolean;
}) {
  const t = useTranslations("reminders");
  const { run, pending } = useRun();
  const [view, setView] = useState<View>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [kinds, setKinds] = useState<PushKind[]>([]);
  const [since, setSince] = useState<string | null>(null);
  /** Bumped when the status line should look at the browser again. */
  const [checked, setChecked] = useState(0);
  const [failed, setFailed] = useState(false);
  /** While the browser asks for permission and subscribes, before the action runs. */
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const support = pushSupport();
      if (support !== "ok") return setView(support);
      if (permissionDenied()) return setView("denied");
      const subscription = await currentSubscription().catch(() => null);
      if (!subscription) return live && setView("off");
      const state = await reminderStateAction({ endpoint: subscription.endpoint });
      if (!live) return;
      if (state.ok && state.data.subscribed) {
        setEndpoint(subscription.endpoint);
        setKinds(state.data.kinds);
        setSince(state.data.since);
        setView("on");
      } else setView("off");
    })();
    return () => {
      live = false;
    };
  }, []);

  /** After a test: a browser the push service no longer knew has been let go of. */
  async function lookAgain() {
    setChecked((n) => n + 1);
    if (!endpoint) return;
    const state = await reminderStateAction({ endpoint });
    if (state.ok && !state.data.subscribed) {
      setEndpoint(null);
      setSince(null);
      setView("off");
    }
  }

  async function turnOn() {
    setFailed(false);
    setAsking(true);
    let subscription: PushSubscription | "denied";
    try {
      subscription = await subscribeBrowser(publicKey);
    } catch {
      setFailed(true);
      return;
    } finally {
      setAsking(false);
      setChecked((n) => n + 1);
    }
    if (subscription === "denied") return setView(permissionDenied() ? "denied" : "off");
    const address = subscription.endpoint;
    const saved = await run(() => subscribeRemindersAction({ endpoint: address }), {
      success: t("enabled"),
      refresh: false,
    });
    if (!saved) return;
    setEndpoint(address);
    setKinds(saved.kinds);
    setSince(saved.since);
    setView("on");
  }

  async function turnOff() {
    const subscription = await currentSubscription().catch(() => null);
    await subscription?.unsubscribe().catch(() => false);
    const address = endpoint ?? subscription?.endpoint;
    if (address)
      await run(() => unsubscribeRemindersAction({ endpoint: address }), {
        success: t("disabled"),
        refresh: false,
      });
    setEndpoint(null);
    setSince(null);
    setChecked((n) => n + 1);
    setView("off");
  }

  async function choose(kind: PushKind, on: boolean) {
    if (!endpoint) return;
    const before = kinds;
    const next = on ? [...kinds, kind] : kinds.filter((k) => k !== kind);
    setKinds(next);
    const saved = await run(() => setReminderKindsAction({ endpoint, kinds: next }), {
      refresh: false,
    });
    setKinds(saved ? saved.kinds : before);
  }

  const hint = (kind: PushKind) =>
    kind === "comment" && coach ? t("kind.commentHintCoach") : t(`kind.${kind}Hint`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {offered.includes("wellbeing") ? t("bodyCoach") : t("body")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {view === "unsupported" && <Note>{t("unsupported")}</Note>}
        {view === "ios" && <Note>{t("ios")}</Note>}
        {view === "denied" && <Note>{t("denied")}</Note>}
        {view === "off" && (
          <Button onClick={turnOn} disabled={pending || asking} className="self-start max-sm:h-11">
            <BellRing data-icon="inline-start" />
            {t("enable")}
          </Button>
        )}
        {failed && <Note>{t("failed")}</Note>}
        {view === "on" && (
          <>
            <Note>{t("on")}</Note>
            <div className="divide-hairline flex flex-col divide-y">
              {offered.map((kind) => (
                <SwitchRow
                  key={kind}
                  label={t(`kind.${kind}`)}
                  hint={hint(kind)}
                  checked={kinds.includes(kind)}
                  disabled={pending}
                  stateText={kinds.includes(kind) ? t("switchOn") : t("switchOff")}
                  onChange={(on) => choose(kind, on)}
                />
              ))}
            </div>
            <TestReminder disabled={pending} onSent={lookAgain} />
            <Button
              variant="outline"
              onClick={turnOff}
              disabled={pending}
              className="self-start max-sm:h-11"
            >
              <BellOff data-icon="inline-start" />
              {t("disable")}
            </Button>
          </>
        )}
        {view !== "loading" && <RemindersDiagnosis since={since} checked={checked} />}
        <p className="text-meta text-xs leading-relaxed">{t("privacy")}</p>
      </CardContent>
    </Card>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-2sm leading-relaxed">{children}</p>;
}
