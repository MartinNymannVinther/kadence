"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Textarea } from "@/components/ui/textarea";
import { formatStamp } from "@/core/dates";
import { deleteCommentAction, editCommentAction } from "@/modules/training/actions";

export type ThreadComment = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One comment: who wrote it and when, and — for its author — a way to
 * change the words or take them back. A coach may take any comment down
 * (ADR 0012); nobody edits someone else's words.
 */
export function CommentItem({
  comment,
  mine,
  canDelete,
}: {
  comment: ThreadComment;
  mine: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("session.comments");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const edited =
    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(() => editCommentAction({ commentId: comment.id, body }));
    if (done !== null) setEditing(false);
  }

  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="text-foreground text-2sm font-semibold">
          {comment.authorName || t("unknownAuthor")}
        </span>
        <time className="text-meta" dateTime={new Date(comment.createdAt).toISOString()}>
          {formatStamp(new Date(comment.createdAt), locale)}
        </time>
        {edited && <span className="text-meta">{t("edited")}</span>}
      </p>
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2">
          <Textarea
            aria-label={t("editLabel")}
            value={body}
            maxLength={4000}
            rows={3}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending || !body.trim()}
              className="max-sm:h-11"
            >
              {common("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-sm:h-11"
              onClick={() => {
                setBody(comment.body);
                setEditing(false);
              }}
            >
              {common("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-reading leading-relaxed whitespace-pre-line">{comment.body}</p>
      )}
      {!editing && (mine || canDelete) && (
        <div className="flex gap-1">
          {mine && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="max-sm:h-11"
              onClick={() => setEditing(true)}
            >
              {common("edit")}
            </Button>
          )}
          <ConfirmButton
            title={t("deleteTitle")}
            body={mine ? t("deleteOwnBody") : t("deleteOtherBody")}
            confirmLabel={common("delete")}
            variant="ghost"
            size="xs"
            onConfirm={() => run(() => deleteCommentAction({ commentId: comment.id }))}
          >
            {common("delete")}
          </ConfirmButton>
        </div>
      )}
    </li>
  );
}
