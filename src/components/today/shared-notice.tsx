import { CircleCheck, CircleX, Copy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { sharedWords } from "./shared-words";

/**
 * What became of a ride shared to Kadence from the phone's share sheet
 * (/api/share lands here with `?shared=`): in words, once, at the top of
 * today's page. One ride that came in lands on the ride itself instead.
 * The values are the address bar's, so anything unknown says nothing, and
 * a reason is one of the decoder's own or reads as the general one
 * (shared-words.ts).
 */
export async function SharedNotice({
  shared,
  count,
  reason,
}: {
  shared: string | undefined;
  count: string | undefined;
  reason: string | undefined;
}) {
  const words = sharedWords(shared, count, reason);
  if (!words) return null;
  const t = await getTranslations("today.shared");
  const upload = await getTranslations("activities.upload.error");

  const text =
    words.kind === "imported"
      ? t("imported", { count: words.count })
      : words.kind === "refused"
        ? upload(words.reason)
        : t(words.kind);
  const good = words.kind === "imported";
  const again = words.kind === "duplicate";
  const Icon = good ? CircleCheck : again ? Copy : CircleX;

  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-2sm leading-relaxed",
        good ? "bg-success-tint text-success font-medium" : again ? "bg-muted" : "bg-warning-tint",
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", !good && !again && "text-destructive")}
      />
      {text}
    </p>
  );
}
