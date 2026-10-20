"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HaijMark } from "@/components/wordmark";

/** A demo is usually built in a few seconds; after this the wait says it is slow. */
const SLOW_AFTER_MS = 12_000;

/**
 * The screen while a demo is built. The demo route makes a whole
 * workspace before it answers (src/app/[locale]/demo/route.ts), and a
 * front page that just sits there for those seconds looks as if the
 * click did nothing. The family's mark keeps time and the words say what
 * is being made. The motion stands still for a reader who asked for less;
 * the words carry the meaning either way, and the whole is a status to a
 * screen reader.
 */
export function DemoWaiting({ variant }: { variant: "team" | "alone" }) {
  const t = useTranslations("landing.demoWait");
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center px-6 backdrop-blur-sm"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <HaijMark moving className="h-10" />
        <p className="font-heading mt-6 text-lg font-semibold">{t("title")}</p>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          {variant === "alone" ? t("alone") : t("team")}
        </p>
        {slow && <p className="text-muted-foreground mt-3 text-sm text-pretty">{t("slow")}</p>}
      </div>
    </div>
  );
}
