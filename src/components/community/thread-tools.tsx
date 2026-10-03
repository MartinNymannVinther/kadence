"use client";

import { useState } from "react";
import { BookPlus, EyeOff, Eye, Flag, Lock, LockOpen, Reply } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  handleReportAction,
  replyAction,
  reportAction,
  setHiddenAction,
  setLockedAction,
  takeWorkoutAction,
} from "@/modules/community/actions";

/** A reply to a thread, signed with the active club. */
export function ReplyForm({ threadId }: { threadId: string }) {
  const tt = useTranslations("community.thread");
  const { run, pending } = useRun();
  const [body, setBody] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const done = await run(() => replyAction({ threadId, body }), { success: tt("replied") });
        if (done !== null) setBody("");
      }}
    >
      <Textarea
        aria-label={tt("reply")}
        placeholder={tt("replyHint")}
        rows={4}
        value={body}
        maxLength={8000}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit" className="self-start" disabled={pending || !body.trim()}>
        <Reply data-icon="inline-start" />
        {tt("reply")}
      </Button>
    </form>
  );
}

/** Report a thread or a reply to the installation's owner, with a line on why. */
export function ReportButton({
  targetKind,
  targetId,
}: {
  targetKind: "thread" | "post";
  targetId: string;
}) {
  const tr = useTranslations("community.report");
  const { run, pending } = useRun();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Flag data-icon="inline-start" />
        {tr("open")}
      </Button>
    );
  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        aria-label={tr("reason")}
        placeholder={tr("reason")}
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={async () => {
            const done = await run(() => reportAction({ targetKind, targetId, reason }), {
              success: tr("sent"),
            });
            if (done !== null) setOpen(false);
          }}
        >
          {tr("send")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {tr("cancel")}
        </Button>
      </div>
    </div>
  );
}

/** The thread's session into the coach's own library. */
export function TakeWorkout({ threadId }: { threadId: string }) {
  const tt = useTranslations("community.thread");
  const { run, pending } = useRun();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => run(() => takeWorkoutAction({ threadId }), { success: tt("taken") })}
    >
      <BookPlus data-icon="inline-start" />
      {tt("take")}
    </Button>
  );
}

/** The owner's controls: hide or show, and lock or open a thread. */
export function Moderate({
  targetKind,
  targetId,
  hidden,
  locked,
}: {
  targetKind: "thread" | "post";
  targetId: string;
  hidden: boolean;
  locked?: boolean;
}) {
  const tm = useTranslations("community.moderate");
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(() => setHiddenAction({ targetKind, targetId, hidden: !hidden }), {
            success: hidden ? tm("shown") : tm("hidden"),
          })
        }
      >
        {hidden ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
        {hidden ? tm("show") : tm("hide")}
      </Button>
      {targetKind === "thread" && locked !== undefined && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(() => setLockedAction({ threadId: targetId, locked: !locked }), {
              success: locked ? tm("unlocked") : tm("locked"),
            })
          }
        >
          {locked ? <LockOpen data-icon="inline-start" /> : <Lock data-icon="inline-start" />}
          {locked ? tm("unlock") : tm("lock")}
        </Button>
      )}
    </div>
  );
}

/** A report the owner has dealt with. */
export function HandleReport({ reportId }: { reportId: string }) {
  const tm = useTranslations("community.moderate");
  const { run, pending } = useRun();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => run(() => handleReportAction({ reportId }), { success: tm("handled") })}
    >
      {tm("handle")}
    </Button>
  );
}
