import { courseAt, placeAt, Towns, type Course, type Heard, type Land } from "@/modules/rulle";

/** Seconds between two tellings: often enough for the sound to follow, seldom enough to cost nothing. */
const EVERY = 0.25;

/**
 * What the rider would hear of the road (ADR 0045), told to the page four
 * times a second for the sound under the ride: the speed the landscape
 * shows, whether the road runs through the country, a town or a city, and
 * on race day the crowd by it.
 */
export class Listener {
  private readonly towns: Towns | null;
  private since = Infinity;

  constructor(
    private readonly course: Course,
    land: Land | null,
    private readonly city: boolean,
    private readonly tell: ((heard: Heard) => void) | undefined,
  ) {
    this.towns = land && tell ? new Towns(land.buildings) : null;
  }

  frame(distance: number, speed: number, seconds: number, crowd: (distance: number) => number) {
    if (!this.tell) return;
    this.since += seconds;
    if (this.since < EVERY) return;
    this.since = 0;
    const at = courseAt(this.course, distance);
    this.tell({
      speed,
      place: placeAt(this.towns, at.x, at.y, this.city),
      crowd: crowd(distance),
    });
  }
}
