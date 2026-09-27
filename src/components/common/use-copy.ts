"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Copies a text to the clipboard and remembers, for two seconds, which
 * one was copied — so the button can say "Kopieret" where it was pressed.
 */
export function useCopy() {
  const t = useTranslations("common");
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        clearTimeout(timer.current);
        setCopied(text);
        timer.current = setTimeout(() => setCopied(null), 2000);
      } catch {
        toast.error(t("copyFailed"));
      }
    },
    [t],
  );

  return { copy, copied };
}
