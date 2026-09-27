"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useRouter } from "@/i18n/navigation";

/**
 * A session opened from a card, as a panel over the page it was opened
 * from. The panel is the page's own `?session=` — so it survives a reload
 * and can be linked — and closing it goes back to the page without it.
 */
export function SessionSheet({
  closeHref,
  title,
  children,
}: {
  closeHref: string;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
        router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-xl">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="p-5 pt-12 sm:p-6 sm:pt-12">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
