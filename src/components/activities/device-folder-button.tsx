"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import { FolderInput } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  filesOfInput,
  findFresh,
  FolderDenied,
  folderSupport,
  pickFolder,
  type FolderFile,
  type FolderFindings,
  type FolderSupport,
} from "./read-device-folder";

/**
 * What the button is doing and what it last found. The upload keeps it:
 * it holds its own files back while a folder is read, and takes the
 * sentence away when files are picked by hand.
 */
export type FolderStatus = { doing: "nothing" | "reading" | "checking"; said: string | null };

/** What the browser can do does not change while the page is open. */
const never = () => () => undefined;
const onServer = (): FolderSupport => null;

/**
 * "Hent fra enheden": the rider plugs the bike computer in, picks it as a
 * folder, and the rides Kadence does not have are handed to the upload.
 * What was found is said in words before anything is sent — how many are
 * new, how many were here already — so a press that brings nothing in is
 * not mistaken for one that failed. The button is there only where the
 * browser can hand over a folder.
 */
export function DeviceFolderButton({
  riderId,
  disabled,
  max,
  status,
  onStatus,
  onFresh,
}: {
  riderId: string;
  disabled: boolean;
  /** The most rides sent in one go; the rest wait for the next. */
  max: number;
  status: FolderStatus;
  onStatus: (next: FolderStatus) => void;
  onFresh: (files: File[]) => void;
}) {
  const t = useTranslations("activities.upload.device");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  // Known only in the browser: the server renders no button, and the
  // first paint after it agrees with that.
  const support = useSyncExternalStore(never, folderSupport, onServer);

  function words({ fresh, known, checked, unreadable }: FolderFindings): string {
    if (fresh.length === 0 && known === 0) return unreadable > 0 ? t("failed") : t("none");
    const sent = Math.min(fresh.length, max);
    const left = fresh.length - sent;
    return [
      fresh.length === 0
        ? t("allKnown", { known })
        : checked
          ? t("found", { fresh: sent })
          : t("unchecked", { count: sent }),
      fresh.length > 0 && known > 0 ? t("known", { known }) : "",
      left > 0 ? t("more", { left }) : "",
      unreadable > 0 ? t("unreadable", { count: unreadable }) : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function take(files: FolderFile[]) {
    onStatus({ doing: "checking", said: null });
    try {
      const found = await findFresh(riderId, files);
      onStatus({ doing: "nothing", said: words(found) });
      if (found.fresh.length > 0) onFresh(found.fresh.slice(0, max));
    } catch {
      onStatus({ doing: "nothing", said: t("failed") });
    }
  }

  async function press() {
    if (support === "input") {
      onStatus({ doing: "nothing", said: null });
      input.current?.click();
      return;
    }
    onStatus({ doing: "reading", said: null });
    let files: FolderFile[] | null;
    try {
      files = await pickFolder();
    } catch (error) {
      // Only the browser's own no is a no; a drive that let go is a failure.
      onStatus({
        doing: "nothing",
        said: error instanceof FolderDenied ? t("denied") : t("failed"),
      });
      return;
    }
    if (files) await take(files);
    else onStatus({ doing: "nothing", said: null });
  }

  if (!support) return null;
  const busy = status.doing !== "nothing";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="outline"
          className="max-sm:h-11"
          disabled={disabled || busy}
          aria-describedby={`${inputId}-hint`}
          onClick={() => void press()}
        >
          <FolderInput data-icon="inline-start" />
          {status.doing === "reading"
            ? t("reading")
            : status.doing === "checking"
              ? t("checking")
              : t("button")}
        </Button>
        <span id={`${inputId}-hint`} className="text-meta text-xs leading-relaxed">
          {t("hint")}
        </span>
      </div>
      {support === "input" && (
        <input
          ref={input}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          // A directory instead of files; React does not know the attribute by name.
          {...{ webkitdirectory: "" }}
          onChange={(e) => {
            const list = e.target.files;
            if (list && list.length > 0) void take(filesOfInput(list));
            e.target.value = "";
          }}
        />
      )}
      {/* There before it has anything to say, so that what it says is read aloud. */}
      <div role="status">
        {status.said && (
          <p className="bg-muted rounded-lg px-3 py-2 text-2sm leading-relaxed">{status.said}</p>
        )}
      </div>
    </div>
  );
}
