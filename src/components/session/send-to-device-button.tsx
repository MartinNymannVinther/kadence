"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Usb } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { dayLabel } from "@/modules/workouts/export/names";
import {
  canWriteToDevice,
  DeviceDenied,
  fetchWorkout,
  pickNewFiles,
  writeFiles,
} from "./send-to-device";

export type DeviceSession = { id: string; title: string; onDate: string };

/** What the browser can do does not change while the page is open. */
const never = () => () => undefined;
const onServer = () => false;

/**
 * "Send til cykelcomputer" (ADR 0031): a session, or the week's, onto a
 * Garmin plugged in with a cable. Where the browser can write to the
 * device, one press asks for it and puts the files in Garmin/NewFiles;
 * elsewhere the press opens the files to download and says where they go.
 * Either way the answer is said in words, and a device the browser cannot
 * see (the newer Edges on a Mac) is named.
 */
export function SendToDeviceButton({
  sessions,
  week = false,
}: {
  sessions: DeviceSession[];
  /** The week's sessions on Today, rather than the one session open. */
  week?: boolean;
}) {
  const t = useTranslations("session.toDevice");
  const hintId = useId();
  // Known only in the browser: the server renders the download way.
  const canWrite = useSyncExternalStore(never, canWriteToDevice, onServer);
  const [working, setWorking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  if (sessions.length === 0) return null;

  async function send() {
    setSaid(null);
    if (!canWrite) {
      setManual((open) => !open);
      return;
    }
    let folder: Awaited<ReturnType<typeof pickNewFiles>>;
    try {
      folder = await pickNewFiles();
    } catch (error) {
      setSaid(error instanceof DeviceDenied ? t("denied") : t("failed"));
      return;
    }
    if (folder === null) return;
    if (folder === "not_garmin") {
      setSaid(t("notGarmin"));
      return;
    }
    setWorking(true);
    try {
      const files = [];
      for (const session of sessions) files.push(await fetchWorkout(session.id));
      await writeFiles(folder, files);
      setSaid(t("sent", { count: files.length }));
    } catch (error) {
      setSaid(error instanceof DeviceDenied ? t("denied") : t("failed"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-fit max-sm:h-11"
        disabled={working}
        aria-describedby={hintId}
        aria-expanded={canWrite ? undefined : manual}
        onClick={() => void send()}
      >
        <Usb data-icon="inline-start" />
        {working ? t("working") : week ? t("weekButton", { count: sessions.length }) : t("button")}
      </Button>
      <p id={hintId} className="text-meta text-xs leading-relaxed">
        {canWrite ? t("hint") : t("manualHint")}
      </p>
      {manual && !canWrite && (
        <div className="bg-muted flex flex-col gap-2 rounded-lg px-3 py-2.5 text-2sm leading-relaxed">
          <p>{t("manual", { count: sessions.length })}</p>
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <a
                  href={`/api/sessions/${encodeURIComponent(session.id)}/export?format=fit`}
                  download
                  className="focus-ring text-primary flex min-h-9 w-fit items-center font-medium hover:underline"
                >
                  {dayLabel(session.onDate)} {session.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-meta text-xs">{t("mtp")}</p>
        </div>
      )}
      {/* There before it has anything to say, so that what it says is read aloud. */}
      <div role="status">
        {said && <p className="bg-muted rounded-lg px-3 py-2 text-2sm leading-relaxed">{said}</p>}
      </div>
      <Link
        href="/help#help-toDevice"
        className="focus-ring text-primary flex min-h-9 w-fit items-center text-2sm font-medium hover:underline"
      >
        {t("help")}
      </Link>
    </div>
  );
}
