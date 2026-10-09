import {
  ChevronRight,
  Dumbbell,
  Flame,
  GraduationCap,
  Medal,
  Shirt,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { features } from "@/core/features";
import { Link } from "@/i18n/navigation";
import { HUB_CALCULATORS, HUB_GUIDES, shownItems, type HubKey } from "@/modules/guides/hub";

const ICON: Record<HubKey, LucideIcon> = {
  energy: Utensils,
  gearing: Wrench,
  classes: GraduationCap,
  equipment: Shirt,
  food: Flame,
  programs: Dumbbell,
  teams: Medal,
};

/**
 * "Viden om sporten" under Viden og hjælp: a card for each open guide and
 * calculator this installation shows (ADR 0047), in the hub's order —
 * calculators, then guides — and none that is parked (ADR 0057). Each
 * leads to its open page, which anyone can read without signing in. The
 * programmes' card says where the same programmes live inside the app,
 * so a coach is not sent out of the frame for what the library holds
 * with more (docs/adr/0078). Rendered on the server only: it reads the
 * installation's features.
 */
export function TopicCards() {
  const t = useTranslations("guides.hub");
  const help = useTranslations("help.knowledge");
  const on = features();
  const items = [...shownItems(HUB_CALCULATORS, on), ...shownItems(HUB_GUIDES, on)];
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = ICON[item.key];
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className="focus-ring border-border bg-card hover:border-primary flex h-full flex-col gap-1.5 rounded-xl border p-4 shadow-surface"
            >
              <span className="flex items-start gap-2 text-reading font-semibold">
                <Icon aria-hidden className="text-primary mt-0.5 size-4.5 shrink-0" />
                {t(`items.${item.key}.title`)}
              </span>
              <span className="text-meta text-2sm leading-relaxed">
                {t(`items.${item.key}.body`)}
              </span>
              {item.key === "programs" && (
                <span className="text-2sm leading-relaxed">{help("programsInApp")}</span>
              )}
              <span className="text-meta mt-auto flex items-center gap-0.5 pt-1 text-xs">
                {help("openPage")}
                <ChevronRight aria-hidden className="size-3.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
