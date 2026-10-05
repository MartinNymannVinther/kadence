import { CHALLENGE, challengeIn, type ChallengeStart, type Course } from "@/modules/rulle";

/**
 * Who turns up on a ride, and where (ADR 0049, 0050): each stretch of the
 * route is looked at once, as the rider comes into it (`challengeIn`), and
 * its race is due when they reach its start. No React and no browser in it.
 */
export class Encounters {
  private considered = -1;
  private next: ChallengeStart | null = null;

  constructor(private readonly course: Course) {}

  /** The race due now, `rider` metres along, if there is one; each comes only once. */
  due(rider: number): ChallengeStart | null {
    const k = Math.floor(rider / CHALLENGE.every);
    if (k > this.considered) {
      this.considered = k;
      this.next = challengeIn(this.course, k);
    }
    const next = this.next;
    if (!next || rider < next.at) return null;
    this.next = null;
    return next;
  }
}
