import { Printer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { withQuery } from "@/components/calendar/href";
import { PrintButton } from "@/components/exercises/library/print-button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * "Udskriv eller gem som PDF" for one session. On the session's own page
 * it prints the page, which on paper keeps what the session is and how to
 * do it — the exercises with their figures and a box for every set — and
 * leaves out what is for the screen (session-view.tsx). The calendar's
 * panel sits over a page of its own, so there the button opens the
 * session's page, which prints itself.
 */
export async function SessionPrint({
  sessionId,
  title,
  place,
  auto,
}: {
  sessionId: string;
  /** The file's name when saved as a PDF. */
  title: string;
  place: "sheet" | "page";
  /** Print at once: the page was opened from the panel to be printed. */
  auto: boolean;
}) {
  const t = await getTranslations("session");
  if (place === "page") return <PrintButton title={title} label={t("print")} auto={auto} />;
  return (
    <Link
      href={withQuery(`/calendar/session/${sessionId}`, { print: "1" })}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-sm:h-11")}
    >
      <Printer data-icon="inline-start" />
      {t("print")}
    </Link>
  );
}
