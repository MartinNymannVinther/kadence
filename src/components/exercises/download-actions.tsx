"use client";

import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Hent som fil" and "Udskriv eller gem som PDF" for a programme, built-in,
 * a team's own or composed (docs/plan-ovelser-og-programmer.md). The print
 * button follows EnergyPrint's approach (src/components/calc/energy-print.tsx):
 * the page turns light for the print, whatever the screen's theme, and the
 * file takes the programme's name.
 */
export function DownloadActions({
  downloadHref,
  printTitle,
}: {
  downloadHref: string;
  printTitle: string;
}) {
  const t = useTranslations("exercises.download");

  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    let pageTitle = document.title;
    const before = () => {
      wasDark = root.classList.contains("dark");
      if (wasDark) root.classList.remove("dark");
      pageTitle = document.title;
      document.title = printTitle;
    };
    const after = () => {
      if (wasDark) root.classList.add("dark");
      document.title = pageTitle;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [printTitle]);

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a
        href={downloadHref}
        download
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Download aria-hidden />
        {t("button")}
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Printer aria-hidden />
        {t("print")}
      </button>
    </div>
  );
}
