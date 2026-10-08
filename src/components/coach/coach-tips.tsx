"use client";

import { useSyncExternalStore } from "react";
import { Lightbulb, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CoachTip } from "@/modules/coach";

const STORE = "kadence.coachTips.hidden";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The stored list as its raw string: stable between reads, so React can compare it. */
function snapshot(): string {
  try {
    return window.localStorage.getItem(STORE) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  try {
    const list: unknown = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((k) => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * The coach's tips on the Today page: a few short pieces of advice from
 * what is coming up, each linked to its section of the coach guide. A tip
 * put away stays away on this device — the same tip for the next race has
 * its own key and comes back. Nothing is stored on the server: a tip is
 * advice, not a record.
 */
export function CoachTips({ tips }: { tips: CoachTip[] }) {
  const t = useTranslations("coachTips");
  // The server knows nothing of what this device put away, so it renders
  // nothing, and the browser fills in.
  const hidden = parse(useSyncExternalStore(subscribe, snapshot, () => null));

  if (hidden === null) return null;
  const shown = tips.filter((tip) => !hidden.has(tip.key));
  if (shown.length === 0) return null;

  const hide = (key: string) => {
    const next = new Set(hidden).add(key);
    try {
      window.localStorage.setItem(STORE, JSON.stringify([...next].slice(-200)));
    } catch {
      // A browser that stores nothing shows the tip again next time.
    }
    for (const listener of listeners) listener();
  };

  return (
    <section aria-labelledby="coach-tips" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="coach-tips" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm">{t("subtitle")}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {shown.map((tip) => (
          <li
            key={tip.key}
            className="border-border bg-card flex items-start gap-3 rounded-xl border p-3.5 shadow-surface"
          >
            <Lightbulb aria-hidden className="text-chart-4 mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-2sm leading-relaxed">{t(tip.id as "heat", tip.values)}</p>
              <Link
                href={`/help/coach#${tip.section}`}
                className="focus-ring text-primary w-fit text-xs font-medium hover:underline"
              >
                {t("readMore")}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => hide(tip.key)}
              className="focus-ring text-meta hover:text-foreground -m-1.5 flex size-9 shrink-0 items-center justify-center rounded-md"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">{t("dismiss")}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
