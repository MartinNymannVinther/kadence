"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { sendTestReminderAction } from "@/modules/push/actions";
import type { TestReport } from "@/modules/push/test-push";

/**
 * "Send en prøve" (P1-05): one reminder to the person's own browsers on
 * this team, so they can see on the phone itself that it arrives and what
 * it looks like. Three an hour; the server counts.
 */
export function TestReminder({
  disabled,
  onSent,
}: {
  disabled?: boolean;
  /** Called after a test, so the card can look at this browser again. */
  onSent: (report: TestReport) => void;
}) {
  const t = useTranslations("reminders");
  const { run, pending } = useRun();

  async function send() {
    const report = await run(() => sendTestReminderAction({}), { refresh: false });
    if (!report) return;
    if (report.sent > 0) toast.success(t("testSent"));
    else if (report.failed > 0) toast.error(t("testFailed"));
    else toast.error(t("testGone"));
    onSent(report);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        onClick={send}
        disabled={disabled || pending}
        className="self-start max-sm:h-11"
      >
        <Send data-icon="inline-start" />
        {t("test")}
      </Button>
      <p className="text-meta text-xs leading-relaxed">{t("testHint")}</p>
    </div>
  );
}
