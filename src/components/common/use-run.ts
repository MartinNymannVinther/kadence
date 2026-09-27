"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Result } from "@/core/result";
import { useRouter } from "@/i18n/navigation";

/**
 * Runs a server action from a form or a button: pending while it runs,
 * the refusal said in the reader's language, the page refreshed after.
 * Every product component goes through this, so an error never
 * disappears silently.
 */
export function useRun() {
  const t = useTranslations("errors");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run<T>(
    action: () => Promise<Result<T>>,
    options: { success?: string; refresh?: boolean } = {},
  ): Promise<T | null> {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        const key =
          result.detail && t.has(result.detail as "closed") ? result.detail : result.error;
        toast.error(t(key as "generic"));
        return null;
      }
      if (options.success) toast.success(options.success);
      if (options.refresh !== false) router.refresh();
      return result.data;
    } catch {
      toast.error(t("generic"));
      return null;
    } finally {
      setPending(false);
    }
  }

  return { run, pending };
}
