import { GarminDerivedNote } from "@/components/devices/garmin-attribution";
import { monthBounds, monthWeeks } from "@/modules/calendar/grid";
import { riderMonth, teamMonth } from "@/modules/calendar/month-data";
import { anyFromGarminIn } from "@/modules/devices/attribution";
import { calendarHref } from "../href";
import { monthCells, teamMonthDays } from "../month-days";
import { MonthNav } from "../period-nav";
import { RiderMonth } from "../rider-month";
import { TeamMonth } from "../team-month";
import { toActivityCard, toCard, toEventCard } from "../to-card";
import type { ViewProps } from "./types";

/**
 * The calendar's month (docs/adr/0093): one rider's weeks with their
 * hours, or — for a coach — the team's days as a matrix. Each read is
 * one transaction with a fixed number of queries (month-data.ts).
 */
export async function MonthView({
  ctx,
  today,
  visible,
  rider,
  teamView,
  query,
  month,
}: ViewProps & { month: string }) {
  const nav = <MonthNav month={month} today={today} query={query} />;

  if (teamView) {
    const read = await teamMonth(
      ctx,
      visible.map((r) => r.id),
      month,
      today,
    );
    const { from, to } = monthBounds(month);
    const days = monthWeeks(month)
      .flatMap((w) => w.days)
      .filter((d) => d.date >= from && d.date <= to)
      .map((d) => d.date);
    const input = {
      sessions: read.sessions.map(toCard),
      activities: read.unplanned.map(toActivityCard),
      events: read.events.map(toEventCard),
    };
    const teamRaces: Record<string, string[]> = {};
    for (const e of input.events)
      if (e.kind === "race" && e.riderId === null)
        for (const date of days)
          if (e.startsOn <= date && e.endsOn >= date) (teamRaces[date] ??= []).push(e.title);
    return (
      <>
        {nav}
        <GarminDerivedNote show={anyFromGarminIn(read.sessions, read.unplanned)} />
        <TeamMonth
          days={days}
          today={today}
          teamRaces={teamRaces}
          rows={visible.map((r) => ({
            id: r.id,
            name: r.name,
            href: calendarHref({ view: "month", month, rider: r.id }),
            days: teamMonthDays(r.id, days, input, today),
            volume: read.volumes.get(r.id) ?? null,
          }))}
        />
      </>
    );
  }

  const read = await riderMonth(ctx, rider.id, month, today);
  const weeks = monthCells(
    rider.id,
    monthWeeks(month),
    {
      sessions: read.sessions.map(toCard),
      activities: read.unplanned.map(toActivityCard),
      events: read.events.map(toEventCard),
    },
    today,
    query,
  );
  return (
    <>
      {nav}
      <GarminDerivedNote show={anyFromGarminIn(read.sessions, read.unplanned)} />
      <RiderMonth weeks={weeks} volumes={Object.fromEntries(read.weeks)} query={query} />
    </>
  );
}
