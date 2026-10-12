"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { isNewBuild } from "@/core/new-version";
import { cn } from "@/lib/utils";

/** How often an open page asks which build the server runs. */
const EVERY_MS = 2 * 60 * 1000;

/**
 * A stripe that appears when Kadence has been updated while this page was
 * open: the page's buttons would call server functions the new build no
 * longer has, so saving would fail with a generic error. The page asks
 * `/api/version` when the tab comes back into view and every two minutes,
 * and says plainly that a reload is all it takes. Nothing reloads by
 * itself: a half-written check-in or session is the person's to keep.
 */
export function NewVersionStripe({ builtAt }: { builtAt: string }) {
  const t = useTranslations("app.newVersion");
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!builtAt) return;
    let stopped = false;
    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { builtAt?: unknown };
        if (!stopped && isNewBuild(builtAt, body.builtAt)) setStale(true);
      } catch {
        // Offline or the server restarting: ask again next time.
      }
    }
    const timer = window.setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [builtAt]);

  if (!stale) return null;
  return (
    <div
      role="status"
      className="bg-warning-tint border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-2sm"
    >
      <p>{t("body")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={cn(buttonVariants({ size: "sm" }), "focus-ring")}
      >
        <RefreshCw data-slot="icon" aria-hidden />
        {t("reload")}
      </button>
    </div>
  );
}
