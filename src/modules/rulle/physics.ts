/**
 * Rulle's physics, in one dimension: the rider is a distance along the
 * course, and the speed there comes from the watts against what a road
 * puts up — the slope pulling the mass back, the tyres rolling, the air.
 * The equations every riding app uses; the numbers are a rider on the
 * hoods of a road bike on good asphalt.
 *
 * The mass is a fixed standard, 70 kg of rider and 8 of bike, and it is
 * never shown: Rulle reads no body data (ADR 0013, 0031). A light rider
 * climbs a little slower on the screen than on the road; the watts, which
 * are what is recorded and what the load is computed from, are the
 * rider's own.
 *
 * Pure: no browser, no database.
 */

export const PHYSICS = {
  massKg: 78,
  /** Drag area, m²: a rider on the hoods. */
  cda: 0.35,
  /** Rolling resistance of a road tyre on asphalt. */
  crr: 0.004,
  /** Air density at sea level, 15 °C, kg/m³. */
  rho: 1.225,
  g: 9.81,
  /** m/s, 90 km/h: nothing on a Danish road goes faster. */
  maxSpeed: 25,
  /** m/s: below this the watts are spread as if at it, or starting would be an infinite force. */
  minDriveSpeed: 1,
  /** s: the longest step the integration takes at once. */
  maxStep: 0.05,
} as const;

/** The force against the rider at `speed` on `grade`, newtons (negative downhill when it pulls). */
export function resistance(speed: number, grade: number): number {
  const { massKg: m, g, crr, cda, rho } = PHYSICS;
  const theta = Math.atan(grade);
  return m * g * Math.sin(theta) + crr * m * g * Math.cos(theta) + 0.5 * rho * cda * speed * speed;
}

/** The speed after `seconds` of `watts` on `grade`, starting from `speed`. */
export function nextSpeed(speed: number, watts: number, grade: number, seconds: number): number {
  let v = Math.max(0, speed);
  let left = Math.max(0, seconds);
  const push = Math.max(0, watts);
  while (left > 1e-9) {
    const dt = Math.min(left, PHYSICS.maxStep);
    const drive = push / Math.max(v, PHYSICS.minDriveSpeed);
    const accel = (drive - resistance(v, grade)) / PHYSICS.massKg;
    v = Math.min(PHYSICS.maxSpeed, Math.max(0, v + accel * dt));
    left -= dt;
  }
  return v;
}

/** The speed `watts` hold on `grade` once the rider has settled, m/s. */
export function steadySpeed(watts: number, grade: number): number {
  const surplus = (v: number) => Math.max(0, watts) - v * resistance(v, grade);
  if (surplus(PHYSICS.maxSpeed) >= 0) return PHYSICS.maxSpeed;
  let lo = 0;
  let hi: number = PHYSICS.maxSpeed;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (surplus(mid) >= 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Metres right of the road's middle: a rider keeps to the right, and
 * wanders a little, slowly, the way a line on a quiet road does.
 */
export function swayAt(metres: number): number {
  return 1.35 + 0.4 * Math.sin(metres / 47) + 0.15 * Math.sin(metres / 13.3 + 1.3);
}
