"use client";

import { useId, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction } from "@/modules/training/actions";
import { CommentItem, type ThreadComment } from "./comment-item";

/**
 * The conversation about a session or an activity (ADR 0012): coach,
 * rider and the rider's parents read the same thread; the coach and the rider write in
 * it under their own names. There is no private corner of it, and the box
 * says so, so nobody writes as if there were.
 */
export function CommentThread({
  target,
  comments,
  currentUserId,
  isCoach,
  canWrite,
}: {
  /** What the thread is about: a planned session or an activity. */
  target: { plannedSessionId: string } | { activityId: string };
  comments: ThreadComment[];
  currentUserId: string;
  isCoach: boolean;
  canWrite: boolean;
}) {
  const t = useTranslations("session.comments");
  const { run, pending } = useRun();
  const [body, setBody] = useState("");
  const boxId = useId();

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    const added = await run(() => addCommentAction({ target, body: text }));
    if (added) setBody("");
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 ? (
        <p className="text-meta text-2sm">{t("empty")}</p>
      ) : (
        <ol className="divide-hairline flex flex-col divide-y">
          {comments.map((comment) => {
            const mine = comment.authorId === currentUserId;
            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                mine={mine}
                canDelete={mine || isCoach}
              />
            );
          })}
        </ol>
      )}
      {canWrite ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor={boxId} className="text-sm font-medium">
            {t("write")}
          </label>
          <Textarea
            id={boxId}
            value={body}
            maxLength={4000}
            rows={2}
            placeholder={t("placeholder")}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-meta text-xs">{t("everyoneReads")}</p>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !body.trim()}
              className="max-sm:h-11"
            >
              <Send data-icon="inline-start" />
              {t("send")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-meta text-xs">{t("readOnly")}</p>
      )}
    </div>
  );
}
