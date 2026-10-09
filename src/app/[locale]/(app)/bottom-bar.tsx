"use client";

import { Ellipsis, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MoreSheetContent, type MoreSheetProps } from "./more-sheet";
import { NAV_ICONS } from "./nav-icons";
import { activeHref, barLabelKey } from "./nav-items";

/**
 * The phone's navigation (ADR 0061, 0068, 0077): a bar at the foot of the
 * screen with the role's primary places — the same four the sidebar puts
 * first — and "Mere" for the rest, within reach of a thumb. Below lg, so
 * an iPad held upright gets it too; the sidebar takes over from lg. Fixed
 * over the home indicator with the safe area beneath it, out of print,
 * and never on Rulle, whose screen stands in front of the bike (it has
 * its own frame, and this is a second guard).
 *
 * The bar is exactly `--bottom-bar` tall, which the content column (see
 * ./sidebar-shell.tsx) keeps free below the page, so nothing hides behind
 * it; a sticky footer inside a page sits on `bottom-[var(--bottom-bar,0px)]` for
 * the same reason.
 */
export function BottomBar(sheet: MoreSheetProps) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/rulle" || pathname.startsWith("/rulle/")) return null;

  const bar = sheet.menu.primary;
  const menu = [...sheet.menu.primary, ...sheet.menu.more];
  // The bar's place is lit only when it is the menu's closest match: under
  // /settings neither a bar place nor anything in "Mere" is, and "Mere" is.
  const lit = activeHref(
    pathname,
    menu.map((item) => item.href),
  );
  const onBar = bar.some((item) => item.href === lit);
  const counts = sheet.counts ?? {};
  // Something new waits behind "Mere": unread threads, or people at the door.
  const news =
    (sheet.attention ?? 0) > 0 || sheet.menu.more.some((item) => (counts[item.key] ?? 0) > 0);

  return (
    <nav
      aria-label={t("barLabel")}
      className="print:hidden! bg-background/95 border-border fixed inset-x-0 bottom-0 z-40 h-(--bottom-bar) border-t pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex h-full max-w-xl items-stretch px-1">
        {bar.map((item) => {
          const Icon = NAV_ICONS[item.key];
          const active = item.href === lit;
          return (
            <li key={item.key} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={barItemClass}
              >
                <BarMark Icon={Icon} active={active} />
                <BarLabel active={active}>{item.text ?? t(barLabelKey(item))}</BarLabel>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className={barItemClass}
                  aria-label={news ? t("moreNews") : undefined}
                />
              }
            >
              <BarMark Icon={Ellipsis} active={open || !onBar} dot={news} />
              <BarLabel active={open || !onBar}>{t("more")}</BarLabel>
            </SheetTrigger>
            <MoreSheetContent {...sheet} onNavigate={() => setOpen(false)} />
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

const barItemClass =
  "focus-ring flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg";

function BarMark({ Icon, active, dot }: { Icon: LucideIcon; active: boolean; dot?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-[120ms] ease-out",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-meta",
      )}
    >
      <Icon aria-hidden className="size-5" />
      {dot ? (
        <span
          aria-hidden
          className="bg-primary ring-background absolute top-0.5 right-2.5 size-2 rounded-full ring-2"
        />
      ) : null}
    </span>
  );
}

function BarLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "max-w-full truncate px-0.5 text-xs leading-none",
        active ? "text-foreground font-semibold" : "text-meta font-medium",
      )}
    >
      {children}
    </span>
  );
}
