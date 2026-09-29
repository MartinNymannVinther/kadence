"use client";

import { useId, useRef, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCopy } from "@/components/common/use-copy";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createUploadKeyAction } from "@/modules/devices/actions";

/**
 * "Ny nøgle": a name for the key, then the key itself — once, with the
 * address a helper sends its files to. Kadence keeps only the key's hash,
 * so what is not copied here is gone. While the key is on the screen the
 * dialog therefore closes from its own button and from nothing else: not
 * from a press beside it, not from Escape, and it has no cross. The page
 * behind it shows the new key at once; the dialog stays where it is, also
 * when this key was the last the rider may have.
 */
export function NewUploadKey({
  endpoint,
  full,
  max,
  returnFocus,
}: {
  endpoint: string;
  /** The rider has as many keys as a rider may have. */
  full: boolean;
  max: number;
  /** Where the keyboard lands when the dialog closes and the button that opened it is gone. */
  returnFocus: React.RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("devices.keys.create");
  const keys = useTranslations("devices.keys");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const base = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setName("");
    setIssued(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const made = await run(() => createUploadKeyAction({ name: name.trim() }), {
      success: t("made"),
      refresh: false,
    });
    if (made) setIssued(made.key);
  }

  return (
    <>
      {full && !open ? (
        <p className="text-meta text-2sm">{keys("limit", { max })}</p>
      ) : (
        <Button
          ref={trigger}
          variant="outline"
          className="max-sm:h-11"
          onClick={() => setOpen(true)}
        >
          <Plus data-icon="inline-start" />
          {t("button")}
        </Button>
      )}
      <Dialog
        open={open}
        // A key on the screen is not closed by accident.
        disablePointerDismissal={issued !== null}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else if (!issued) close();
        }}
      >
        <DialogContent
          showCloseButton={!issued}
          finalFocus={() => trigger.current ?? returnFocus.current}
        >
          {issued ? (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("issuedTitle")}</DialogTitle>
                <DialogDescription>{t("issuedBody")}</DialogDescription>
              </DialogHeader>
              <Copyable label={t("key")} value={issued} first />
              <Copyable label={t("address")} value={endpoint} />
              <DialogFooter>
                <Button className="max-sm:h-11" onClick={close}>
                  {t("done")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("body")}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${base}-name`} className="text-sm font-medium">
                  {t("name")}
                </label>
                <Input
                  id={`${base}-name`}
                  required
                  maxLength={60}
                  value={name}
                  placeholder={t("placeholder")}
                  autoComplete="off"
                  className="max-sm:h-11"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending || !name.trim()} className="max-sm:h-11">
                  {t("submit")}
                </Button>
                <Button type="button" variant="ghost" className="max-sm:h-11" onClick={close}>
                  {common("cancel")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * A value to copy, under its name: the whole of it, breaking where it
 * must. The button is named for what it copies, so two of them in one
 * dialog are told apart by ear as well.
 */
function Copyable({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const t = useTranslations("devices.keys.create");
  const { copy, copied } = useCopy();
  const id = useId();
  const done = copied === value;
  return (
    <div className="bg-accent/60 border-border flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <p id={`${id}-what`} className="font-medium">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-card border-border max-w-full min-w-0 flex-1 rounded border px-2 py-1.5 text-xs break-all">
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="max-sm:h-11"
          // The form the keyboard was in is gone: it goes on from the key.
          autoFocus={first}
          aria-labelledby={`${id}-does ${id}-what`}
          onClick={() => void copy(value)}
        >
          {done ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          <span id={`${id}-does`}>{done ? t("copied") : t("copy")}</span>
        </Button>
        <span role="status" className="sr-only">
          {done ? t("copied") : ""}
        </span>
      </div>
    </div>
  );
}
