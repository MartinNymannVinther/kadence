/**
 * Which page a person lands on (docs/adr/0063). A parent who is nothing
 * else has one page, about the child: their Today is /parents. Mig (/me)
 * is a rider's own page; a coach or a parent who opens it goes back to
 * their own front page. The parents' page is about a child, so somebody
 * with no child here — a coach following an old link to the guide that
 * used to stand there — goes to the guide under Viden og hjælp. Pure,
 * from the answer of `whoAmI`.
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

/** Where /parents sends this person instead, or null to stay: a child, confirmed or not, keeps them. */
export function parentsElsewhere(me: Who): "/help/parents" | null {
  return me !== null && me.children.length > 0 ? null : "/help/parents";
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
