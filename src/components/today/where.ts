/**
 * Which page a person lands on (docs/adr/0062). A parent who is nothing
 * else has one page, about the child: their Today is /parents. Mig (/me)
 * is a rider's own page; a coach or a parent who opens it goes back to
 * their own front page. Pure, from the answer of `whoAmI`.
 */

type Who = {
  isCoach: boolean;
  rider: unknown;
  children: readonly unknown[];
} | null;

const parentOnly = (me: Who) => me !== null && !me.isCoach && !me.rider && me.children.length > 0;

/** Where /today sends this person instead, or null to stay. */
export function todayElsewhere(me: Who): "/parents" | null {
  return parentOnly(me) ? "/parents" : null;
}

/** Where /me sends this person instead, or null to stay. */
export function meElsewhere(me: Who): "/today" | "/parents" | null {
  if (me?.rider) return null;
  return parentOnly(me) ? "/parents" : "/today";
}

/**
 * The club's picture over Today is the empty day's: shown when there is
 * no session today and nothing waiting for an answer, so a day with
 * something to do starts with it.
 */
export function coverShown(day: { sessionsToday: number; waiting: boolean }): boolean {
  return day.sessionsToday === 0 && !day.waiting;
}
