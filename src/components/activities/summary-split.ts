/**
 * Which of a ride's numbers come first (docs/adr/0062): time in motion,
 * distance and climbing, and how close it came to the plan — or the
 * average pulse when nothing was planned. A ride without one of those
 * fills the four from the next that it has. Everything else waits under
 * "Mere data". Pure: works on the tiles' keys.
 */

const FIRST = ["time", "distance", "ascent"] as const;
const FILL = ["avgHr", "avgSpeed", "avgPower", "load"] as const;
export const FIRST_COUNT = 4;

export function splitTiles(
  keys: readonly string[],
  hasPlan: boolean,
): { first: string[]; rest: string[] } {
  const wanted: string[] = [...FIRST, hasPlan ? "plan" : "avgHr"];
  const first = wanted.filter((key) => keys.includes(key));
  for (const key of FILL) {
    if (first.length >= FIRST_COUNT) break;
    if (keys.includes(key) && !first.includes(key)) first.push(key);
  }
  return { first, rest: keys.filter((key) => !first.includes(key)) };
}
