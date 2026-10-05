import { pitchRadiusMm } from "@/modules/calc/gearing";

/**
 * A road bike's shape side on, in metres from the rear hub along the
 * ground and up from it: a 98 cm wheelbase, 41 cm chainstays, a 7 cm
 * bottom-bracket drop and 172.5 mm cranks — a small road frame, near
 * enough for a drawing. The wheel's radius comes from the tyre chosen.
 */
const BIKE = {
  wheelbase: 0.98,
  chainstay: 0.405,
  bbDrop: 0.07,
  seatCluster: [0.25, 0.44],
  headTop: [0.8, 0.42],
  headBottom: [0.835, 0.27],
  crank: 0.1725,
} as const;

/** How far the drawing reaches ahead of the rear hub, and behind it, in metres. */
export const BIKE_AHEAD_M = BIKE.wheelbase + 0.36;
export const BIKE_BEHIND_M = 0.36;
/** The drawing's height above the ground, in metres, saddle included. */
export const BIKE_HEIGHT_M = 0.98;

const SPOKES = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);

/**
 * Trigonometry may differ in its last digit between the server and the
 * browser, which React reports as a mismatch; a hundredth of a pixel is
 * as fine as the drawing needs.
 */
const q = (n: number) => Math.round(n * 100) / 100;

/**
 * The bike drawn at `scale` pixels to the metre with its rear hub above
 * `x` and its wheels on `ground`. The wheels turn `wheelDeg` and the
 * cranks `crankDeg`, both clockwise, as they do seen from the chain's
 * side when the bike rolls to the right. The chainring and the sprocket
 * are drawn at their real size, so the gear chosen is seen as well as
 * read. One spot on each tyre and the near pedal are coloured, so the
 * turns can be counted.
 */
export function RolloutBike({
  x,
  ground,
  scale,
  circumferenceMm,
  ring,
  cog,
  wheelDeg,
  crankDeg,
  ink = "var(--foreground)",
}: {
  x: number;
  ground: number;
  scale: number;
  circumferenceMm: number;
  ring: number;
  cog: number;
  wheelDeg: number;
  crankDeg: number;
  /** The frame's colour: the warning ink once the bike is past the limit. */
  ink?: string;
}) {
  const radius = circumferenceMm / 1000 / (2 * Math.PI);
  const px = (m: number) => x + m * scale;
  const py = (m: number) => ground - m * scale;
  const at = ([mx, my]: readonly [number, number]) => `${px(mx)},${py(my + radius)}`;

  const rear = { x: px(0), y: py(radius) };
  const front = { x: px(BIKE.wheelbase), y: py(radius) };
  const bb = { x: px(BIKE.chainstay), y: py(radius - BIKE.bbDrop) };
  const ringR = q((pitchRadiusMm(ring) / 1000) * scale);
  const cogR = q((pitchRadiusMm(cog) / 1000) * scale);
  const crank = BIKE.crank * scale;
  const stroke = Math.max(1.2, scale * 0.028);
  const thin = Math.max(0.6, scale * 0.008);

  const wheel = (hub: { x: number; y: number }) => (
    <g transform={`rotate(${wheelDeg} ${hub.x} ${hub.y})`}>
      <circle
        cx={hub.x}
        cy={hub.y}
        r={radius * scale}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={stroke * 1.15}
      />
      <circle
        cx={hub.x}
        cy={hub.y}
        r={(radius - 0.04) * scale}
        fill="none"
        stroke="var(--meta)"
        strokeWidth={thin * 1.5}
      />
      {SPOKES.map((a) => (
        <line
          key={a}
          x1={hub.x}
          y1={hub.y}
          x2={q(hub.x + Math.cos(a) * (radius - 0.04) * scale)}
          y2={q(hub.y + Math.sin(a) * (radius - 0.04) * scale)}
          stroke="var(--meta)"
          strokeWidth={thin}
        />
      ))}
      <circle cx={hub.x} cy={hub.y - radius * scale} r={stroke * 1.1} fill="var(--primary)" />
      <circle cx={hub.x} cy={hub.y} r={stroke * 0.8} fill="var(--foreground)" />
    </g>
  );

  const crankArm = (deg: number, near: boolean) => (
    <g transform={`rotate(${deg} ${bb.x} ${bb.y})`}>
      <line
        x1={bb.x}
        y1={bb.y}
        x2={bb.x}
        y2={bb.y + crank}
        stroke={near ? "var(--foreground)" : "var(--meta)"}
        strokeWidth={stroke * 1.1}
        strokeLinecap="round"
      />
      <rect
        x={bb.x - stroke * 2.4}
        y={bb.y + crank - stroke * 0.7}
        width={stroke * 4.8}
        height={stroke * 1.4}
        rx={stroke * 0.5}
        fill={near ? "var(--primary)" : "var(--meta)"}
      />
    </g>
  );

  const seat = BIKE.seatCluster;
  const saddle: [number, number] = [seat[0] - 0.05, seat[1] + 0.16];

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {crankArm(crankDeg + 180, false)}
      {wheel(rear)}
      {wheel(front)}
      <line
        x1={bb.x}
        y1={bb.y - ringR}
        x2={rear.x}
        y2={rear.y - cogR}
        stroke="var(--meta)"
        strokeWidth={thin * 1.6}
      />
      <line
        x1={bb.x}
        y1={bb.y + ringR}
        x2={rear.x}
        y2={rear.y + cogR}
        stroke="var(--meta)"
        strokeWidth={thin * 1.6}
      />
      <circle
        cx={rear.x}
        cy={rear.y}
        r={cogR}
        fill="var(--card)"
        stroke="var(--foreground)"
        strokeWidth={thin * 1.6}
      />
      <polyline
        points={[at([0, 0]), at([BIKE.chainstay, -BIKE.bbDrop]), at(seat), at([0, 0])].join(" ")}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
      />
      <polyline
        points={[
          at(seat),
          at(BIKE.headTop),
          at(BIKE.headBottom),
          at([BIKE.chainstay, -BIKE.bbDrop]),
        ].join(" ")}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
      />
      <polyline
        points={[at(BIKE.headBottom), at([BIKE.wheelbase, 0])].join(" ")}
        fill="none"
        stroke={ink}
        strokeWidth={stroke * 0.9}
      />
      <polyline
        points={[at(seat), at(saddle)].join(" ")}
        fill="none"
        stroke={ink}
        strokeWidth={stroke * 0.8}
      />
      <line
        x1={px(saddle[0] - 0.07)}
        y1={py(saddle[1] + radius)}
        x2={px(saddle[0] + 0.08)}
        y2={py(saddle[1] + radius + 0.01)}
        stroke={ink}
        strokeWidth={stroke * 1.5}
      />
      <path
        d={`M${at(BIKE.headTop)} L${at([0.87, 0.46])} Q${at([0.97, 0.47])} ${at([0.95, 0.37])} L${at([0.9, 0.34])}`}
        fill="none"
        stroke={ink}
        strokeWidth={stroke * 0.9}
      />
      <circle
        cx={bb.x}
        cy={bb.y}
        r={ringR}
        fill="var(--card)"
        stroke="var(--foreground)"
        strokeWidth={thin * 1.8}
      />
      {crankArm(crankDeg, true)}
      <circle cx={bb.x} cy={bb.y} r={stroke * 0.9} fill="var(--foreground)" />
    </g>
  );
}
