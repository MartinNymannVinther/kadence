"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Print the page, or save it as a PDF from the browser's own dialog. While
 * printing the page is light whatever the theme, so a dark screen does not
 * become a black sheet, and the file takes `title` as its name — as the
 * energy advice does (src/components/calc/energy-print.tsx).
 */
export function PrintButton({ title, label }: { title: string; label: string }) {
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
    <Button size="sm" variant="outline" className="max-sm:h-11" onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      {label}
    </Button>
  );
}
