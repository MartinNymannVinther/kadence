import { seasonStartYear } from "@/modules/dcu";
import { seasonMonthKeys } from "@/modules/calendar/grid";
import { riderSeason, teamSeason } from "@/modules/calendar/season-data";
import { calendarHref, withQuery } from "../href";
import { SeasonNav } from "../period-nav";
import { RiderYear } from "../rider-year";
import { TeamYear } from "../team-year";
import type { ViewProps } from "./types";

/**
 * The calendar's year — the season from October, as the season plan, DCU
 * and the training profiles count it (docs/adr/0093): one rider's twelve
 * months, or the team's riders by month. An overview; the plan is changed
 * on the season page, which it links to.
 */
export async function YearView({
  ctx,
  today,
  visible,
  rider,
  teamView,
  query,
  season,
}: ViewProps & { season: number }) {
  const nav = <SeasonNav season={season} current={seasonStartYear(today)} query={query} />;

  if (teamView) {
    const read = await teamSeason(
      ctx,
      visible.map((r) => r.id),
      season,
      today,
    );
    return (
      <>
        {nav}
        <TeamYear
          months={seasonMonthKeys(season)}
          races={read.races}
          monthHref={(riderId, month) => calendarHref({ view: "month", month, rider: riderId })}
          rows={visible.map((r) => ({
            id: r.id,
            name: r.name,
            href: calendarHref({ view: "year", year: season, rider: r.id }),
            months: read.months.get(r.id) ?? [],
          }))}
        />
      </>
    );
  }

  const read = await riderSeason(ctx, rider.id, season, today);
  return (
    <>
      {nav}
      <RiderYear
        months={read.months}
        soFar={read.soFar}
        events={read.events}
        monthHref={(month) => calendarHref({ ...query, view: "month", month })}
        seasonHref={withQuery("/season", {
          rider: query.rider,
          season: season === seasonStartYear(today) ? null : String(season),
        })}
      />
    </>
  );
}
