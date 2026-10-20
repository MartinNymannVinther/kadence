"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Print the advice, or save it as a PDF from the browser's own print
 * dialog — no library. While printing the page is light whatever the
 * theme, so a dark screen does not become a black sheet, and the file
 * takes `title` as its name. Ctrl+P does the same as the button.
 */
export function EnergyPrint({ title }: { title: string }) {
  const t = useTranslations("calculators.energy.print");

  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    let pageTitle = document.title;
    const before = () => {
      wasDark = root.classList.contains("dark");
      if (wasDark) root.classList.remove("dark");
      pageTitle = document.title;
      document.title = title;
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
  }, [title]);

  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden />
      {t("button")}
    </Button>
  );
}
