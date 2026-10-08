import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Back to the hub, then the page's title and introduction. */
export function OpenPageHead({ title, intro }: { title: string; intro: string }) {
  const t = useTranslations("open");
  return (
    <div className="flex flex-col gap-2 pb-6">
      <Link
        href="/guides"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm print:hidden"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <h1 className="font-heading text-3xl font-semibold text-balance">{title}</h1>
      <p className="text-reading leading-relaxed">{intro}</p>
    </div>
  );
}
