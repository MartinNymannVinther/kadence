import { Bubble } from "./energy-rider-bubble";
import { RiderHead, SKIN, type RiderLook } from "./energy-rider-head";

export type P = { x: number; y: number };

/**
 * A rider on a road bike, side on, in units of about 2 cm with the ground
 * at y = 0 and the rear hub at x = 0: the shape of a small road frame,
 * near enough for a cartoon. The legs follow the pedals by two-bone
 * reach, so the cranks can turn; the torso, head and arms take their
 * pose from the look — slumped when the energy is gone, upright with
 * both arms in the air over the line.
 */
const WHEEL_R = 17;
const REAR: P = { x: 0, y: -17 };
const FRONT: P = { x: 66, y: -17 };
const BB: P = { x: 26, y: -15 };
const SEAT: P = { x: 19, y: -44 };
const HEAD_TOP: P = { x: 58, y: -45 };
const HEAD_LOW: P = { x: 60, y: -36 };
const HANDS: P = { x: 66, y: -48 };
const HIP: P = { x: 15, y: -53 };
const CRANK = 8;
const THIGH = 24;
const SHIN = 23.5;
const UPPER_ARM = 17;
const FOREARM = 17;

/** The rider's width in units, and the point that sits on the rider's place on the road. */
export const RIDER_WIDTH = 100;
export const RIDER_CENTRE = 33;

const JERSEY = "#e0533d";
const SHORTS = "#2b2b33";
const FRAME = "#2c7da0";
const TYRE = "#2b2b33";
const SHADE = "#00000040";

const POSE: Record<"ride" | "slump" | "up", { shoulder: P; head: P }> = {
  ride: { shoulder: { x: 45, y: -73 }, head: { x: 53, y: -81 } },
  slump: { shoulder: { x: 47, y: -67 }, head: { x: 56, y: -69 } },
  up: { shoulder: { x: 25, y: -83 }, head: { x: 28, y: -94 } },
};

/** Two-bone reach: the knee or elbow between `a` and `b`, bent to the side `bend` gives. */
function joint(a: P, b: P, l1: number, l2: number, bend: 1 | -1): P {
  const d = Math.min(
    l1 + l2 - 0.01,
    Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(b.x - a.x, b.y - a.y)),
  );
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const t = Math.atan2(b.y - a.y, b.x - a.x) + bend * Math.acos(Math.min(1, Math.max(-1, cos)));
  return { x: a.x + l1 * Math.cos(t), y: a.y + l1 * Math.sin(t) };
}

/** Trigonometry may differ in its last digit between server and browser; a hundredth is enough. */
const q = (n: number) => Math.round(n * 100) / 100;
const seg = (a: P, b: P) => ({ x1: q(a.x), y1: q(a.y), x2: q(b.x), y2: q(b.y) });
const mix = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function Wheel({ hub, deg }: { hub: P; deg: number }) {
  return (
    <g transform={`rotate(${q(deg)} ${hub.x} ${hub.y})`}>
      <circle cx={hub.x} cy={hub.y} r={WHEEL_R} fill="none" stroke={TYRE} strokeWidth={3} />
      <circle
        cx={hub.x}
        cy={hub.y}
        r={WHEEL_R - 2.6}
        fill="none"
        stroke="#9aa0a6"
        strokeWidth={1}
      />
      {[0, 45, 90, 135].map((a) => (
        <line
          key={a}
          x1={q(hub.x - (WHEEL_R - 3) * Math.cos((a * Math.PI) / 180))}
          y1={q(hub.y - (WHEEL_R - 3) * Math.sin((a * Math.PI) / 180))}
          x2={q(hub.x + (WHEEL_R - 3) * Math.cos((a * Math.PI) / 180))}
          y2={q(hub.y + (WHEEL_R - 3) * Math.sin((a * Math.PI) / 180))}
          stroke="#b5bac0"
          strokeWidth={0.6}
        />
      ))}
      <circle cx={hub.x} cy={hub.y - WHEEL_R} r={1.3} fill="#f2b705" />
      <circle cx={hub.x} cy={hub.y} r={1.6} fill={TYRE} />
    </g>
  );
}

function Leg({ pedal, far }: { pedal: P; far: boolean }) {
  const knee = joint(HIP, pedal, THIGH, SHIN, -1);
  const skin = far ? "#c08f6c" : SKIN;
  return (
    <g>
      <line {...seg(HIP, knee)} stroke={skin} strokeWidth={7.5} strokeLinecap="round" />
      <line
        {...seg(HIP, mix(HIP, knee, 0.7))}
        stroke={far ? "#1b1b22" : SHORTS}
        strokeWidth={8.5}
        strokeLinecap="round"
      />
      <line {...seg(knee, pedal)} stroke={skin} strokeWidth={6} strokeLinecap="round" />
      <line
        {...seg(mix(knee, pedal, 0.75), pedal)}
        stroke="#ffffff"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <ellipse
        cx={q(pedal.x + 2)}
        cy={q(pedal.y + 0.5)}
        rx={5}
        ry={2.2}
        fill={far ? "#1b1b22" : "#3a3a44"}
      />
    </g>
  );
}

function Arm({ shoulder, hand, far }: { shoulder: P; hand: P; far: boolean }) {
  const elbow = joint(shoulder, hand, UPPER_ARM, FOREARM, hand.y < shoulder.y ? -1 : 1);
  const skin = far ? "#c08f6c" : SKIN;
  return (
    <g>
      <line {...seg(shoulder, elbow)} stroke={skin} strokeWidth={5} strokeLinecap="round" />
      <line
        {...seg(shoulder, mix(shoulder, elbow, 0.5))}
        stroke={far ? "#b8402f" : JERSEY}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line {...seg(elbow, hand)} stroke={skin} strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={q(hand.x)} cy={q(hand.y)} r={2.4} fill={far ? "#1b1b22" : "#3a3a44"} />
    </g>
  );
}

const CONFETTI = [
  [-14, -96, "#e0533d", 20],
  [-4, -112, "#2c7da0", -30],
  [10, -120, "#f2b705", 45],
  [40, -118, "#4a6b53", 10],
  [56, -110, "#d4407a", -50],
  [72, -100, "#5fb3e0", 30],
  [80, -84, "#f08a24", -15],
  [-20, -78, "#d4407a", 60],
] as const;

/**
 * The rider at `x` along the road, `ground` the road's surface, `scale`
 * pixels to a unit. `crankDeg` turns the cranks and the wheels with them.
 * `moving` draws speed lines behind a rider who rides well.
 */
export function EnergyRider({
  x,
  ground,
  scale,
  look,
  crankDeg,
  hot,
  moving,
}: {
  x: number;
  ground: number;
  scale: number;
  look: RiderLook;
  crankDeg: number;
  hot: boolean;
  moving: boolean;
}) {
  const pose = POSE[look === "podium" ? "up" : look === "empty" ? "slump" : "ride"];
  const a = (crankDeg * Math.PI) / 180;
  const near = { x: BB.x + CRANK * Math.cos(a), y: BB.y + CRANK * Math.sin(a) };
  const far = { x: BB.x - CRANK * Math.cos(a), y: BB.y - CRANK * Math.sin(a) };
  const up = look === "podium";
  const handsUp = {
    near: { x: pose.shoulder.x + 10, y: pose.shoulder.y - 30 },
    far: { x: pose.shoulder.x - 6, y: pose.shoulder.y - 31 },
  };
  const belly = mix(HIP, pose.shoulder, 0.35);
  const wheelDeg = crankDeg * 2.6;

  return (
    <g transform={`translate(${q(x - RIDER_CENTRE * scale)} ${q(ground)}) scale(${q(scale)})`}>
      <ellipse cx={33} cy={0.5} rx={46} ry={3} fill={SHADE} />
      {moving && look === "good" && (
        <g stroke="#ffffffcc" strokeWidth={1.6} strokeLinecap="round">
          <line x1={-34} y1={-30} x2={-22} y2={-30} />
          <line x1={-40} y1={-48} x2={-24} y2={-48} />
          <line x1={-32} y1={-64} x2={-20} y2={-64} />
        </g>
      )}
      <Wheel hub={REAR} deg={wheelDeg} />
      <Wheel hub={FRONT} deg={wheelDeg} />
      <line {...seg(BB, far)} stroke="#55555f" strokeWidth={2.4} strokeLinecap="round" />
      <Leg pedal={far} far />
      {!up && <Arm shoulder={pose.shoulder} hand={{ x: HANDS.x - 1, y: HANDS.y + 1 }} far />}
      {up && <Arm shoulder={pose.shoulder} hand={handsUp.far} far />}
      <g stroke={FRAME} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${REAR.x} ${REAR.y} L${BB.x} ${BB.y} L${SEAT.x} ${SEAT.y} Z`} />
        <path
          d={`M${SEAT.x} ${SEAT.y} L${HEAD_TOP.x} ${HEAD_TOP.y} L${HEAD_LOW.x} ${HEAD_LOW.y} L${BB.x} ${BB.y}`}
        />
        <path d={`M${HEAD_LOW.x} ${HEAD_LOW.y} Q63 -25 ${FRONT.x} ${FRONT.y}`} />
      </g>
      <line x1={SEAT.x} y1={SEAT.y} x2={17} y2={-50} stroke="#55555f" strokeWidth={2} />
      <path
        d="M9 -51 Q16 -53.5 24 -50.5"
        stroke={TYRE}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M58 -45 L63 -47.5 Q69 -48.5 69 -43.5 Q69 -39 65 -38.6"
        stroke={TYRE}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <line {...seg(HIP, pose.shoulder)} stroke={JERSEY} strokeWidth={13} strokeLinecap="round" />
      <line
        {...seg(mix(HIP, pose.shoulder, 0.5), mix(HIP, pose.shoulder, 0.56))}
        stroke="#ffffff"
        strokeWidth={13}
      />
      {look === "stomach" && (
        <path
          d={`M${q(belly.x)} ${q(belly.y)} m-1 0 a1 1 0 1 1 2 0 a2 2 0 1 1 -4 0 a3 3 0 1 1 6 0`}
          fill="none"
          stroke="#3c8f3c"
          strokeWidth={1.2}
        />
      )}
      {look === "slosh" && (
        <path
          d={`M${q(belly.x - 5)} ${q(belly.y)} q1.25 -1.6 2.5 0 t2.5 0 t2.5 0 t2.5 0`}
          fill="none"
          stroke="#5fb3e0"
          strokeWidth={1.4}
        />
      )}
      <circle cx={BB.x} cy={BB.y} r={6.5} fill="none" stroke="#55555f" strokeWidth={1.4} />
      <line {...seg(BB, near)} stroke="#3a3a44" strokeWidth={2.6} strokeLinecap="round" />
      <Leg pedal={near} far={false} />
      <RiderHead cx={pose.head.x} cy={pose.head.y} look={look} hot={hot} />
      <Arm shoulder={pose.shoulder} hand={up ? handsUp.near : HANDS} far={false} />
      <Bubble at={{ x: pose.head.x + 4, y: pose.head.y - 22 }} look={look} />
      {up &&
        CONFETTI.map(([cx, cy, fill, rot], i) => (
          <rect
            key={i}
            x={cx}
            y={cy}
            width={4}
            height={2.4}
            fill={fill}
            transform={`rotate(${rot} ${cx} ${cy})`}
          />
        ))}
    </g>
  );
}
