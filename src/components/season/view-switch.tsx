import { getTranslations } from "next-intl/server";
import { SegmentedFilter } from "@/components/ui/segmented";

/** The coach's two ways to look at the season: the whole team, or one rider's plan. */
export async function ViewSwitch({ team, riderHref }: { team: boolean; riderHref: string }) {
  const view = await getTranslations("season.view");
  return (
    <SegmentedFilter
      className="self-start"
      items={[
        { key: "rider", label: view("rider"), href: riderHref, active: !team },
        { key: "team", label: view("team"), href: "/season?view=team", active: team },
      ]}
    />
  );
}
