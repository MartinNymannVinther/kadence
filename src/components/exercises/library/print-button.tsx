"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Print the page, or save it as a PDF from the browser's own dialog. While
 * printing the page is light whatever the theme, so a dark screen does not
 * become a black sheet, and the file takes `title` as its name — as the
 * energy advice does (src/components/calc/energy-print.tsx).
 *
 * `auto` prints once as soon as the page has its fonts: a page opened to
 * be printed, as a session is from its panel (`?print=1`). The address
 * then loses its `print`, so a reload does not print again.
 */
export function PrintButton({
  title,
  label,
  auto = false,
}: {
  title: string;
  label: string;
  auto?: boolean;
}) {
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

    let cancelled = false;
    if (auto) {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("print");
        window.history.replaceState(window.history.state, "", url);
        window.print();
      });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [title, auto]);

  return (
    <Button size="sm" variant="outline" className="max-sm:h-11" onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      {label}
    </Button>
  );
}
