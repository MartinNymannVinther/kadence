import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignalBadges } from "@/components/insight/signal-badges";
import type { RiderSignals } from "@/components/insight/signals";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { AccountBadge, type AccountState } from "./account-badge";

export type RiderRowView = {
  id: string;
  name: string;
  birthYear: number;
  classLabel: string;
  /** The class alone, for the filter: "U17", "Senior". */
  classKey: string;
  account: AccountState;
  parents: number;
  archived: boolean;
  /** The rider's open flags this week (ADR 0062), with the anchor pointed at the team's week. */
  signals: RiderSignals | null;
};

/**
 * The team, one row per rider: name, birth year and class, whether they
 * have an account, and how many parents are linked. A list rather than a
 * table, so it reads the same on a phone; every row opens the rider. A
 * rider with something worth a look this week carries the badges the
 * team's week shows (ADR 0062), here as marks rather than links, because
 * the row is the link.
 */
export function RiderList({ riders }: { riders: RiderRowView[] }) {
  const t = useTranslations("riders.list");
  return (
    <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
      {riders.map((rider) => (
        <li key={rider.id}>
          <Link
            href={`/riders/${rider.id}`}
            className="focus-ring hover:bg-secondary/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-none px-4 py-3 first:rounded-t-xl last:rounded-b-xl"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {rider.name}
                {rider.archived && <Badge variant="outline">{t("archived")}</Badge>}
              </span>
              <span className="text-meta text-xs">
                {t("meta", { year: rider.birthYear, class: rider.classLabel })}
              </span>
              {rider.signals && (
                <SignalBadges name={rider.name} signals={rider.signals} row asLink={false} />
              )}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <AccountBadge state={rider.account} />
              <span className="text-meta flex items-center gap-1 text-xs">
                <Users aria-hidden className="size-3.5" />
                {t("parents", { count: rider.parents })}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
