import type { P } from "./energy-rider";
import type { RiderLook } from "./energy-rider-head";

const INK = "#2b2b33";
const EDGE = "#00000040";

/** What hangs over the rider's head for a look: a battery, a drop, a swirl or waves. */
export function Bubble({ at, look }: { at: P; look: RiderLook }) {
  if (look === "good" || look === "ready" || look === "podium") return null;
  const { x, y } = at;
  return (
    <g>
      <rect
        x={x - 11}
        y={y - 8}
        width={22}
        height={14}
        rx={4}
        fill="#ffffff"
        stroke={EDGE}
        strokeWidth={0.6}
      />
      <path d={`M${x - 3} ${y + 6} L${x - 5} ${y + 10} L${x + 1} ${y + 6} Z`} fill="#ffffff" />
      {(look === "hungry" || look === "empty") && (
        <g>
          <rect
            x={x - 7}
            y={y - 4}
            width={12}
            height={7}
            rx={1.2}
            fill="none"
            stroke={INK}
            strokeWidth={1}
          />
          <rect x={x + 5.4} y={y - 1.8} width={1.6} height={2.8} fill={INK} />
          <rect
            x={x - 6}
            y={y - 3}
            width={look === "hungry" ? 5 : 1.6}
            height={5}
            fill={look === "hungry" ? "#e8a020" : "#d9342b"}
          />
        </g>
      )}
      {look === "thirsty" && (
        <path
          d={`M${x} ${y - 5} q-4.6 5.6 -4 7.6 q1 2.6 4 2.6 q3 0 4 -2.6 q0.6 -2 -4 -7.6 Z`}
          fill="none"
          stroke="#2c7da0"
          strokeWidth={1.2}
        />
      )}
      {look === "stomach" && (
        <path
          d={`M${x} ${y - 1} m-1 0 a1 1 0 1 1 2 0 a2 2 0 1 1 -4 0 a3 3 0 1 1 6 0 a4 4 0 1 1 -8 0`}
          fill="none"
          stroke="#3c8f3c"
          strokeWidth={1}
        />
      )}
      {look === "slosh" && (
        <path
          d={`M${x - 7} ${y - 1.5} q1.75 -2 3.5 0 t3.5 0 t3.5 0 t3.5 0 M${x - 7} ${y + 2.5} q1.75 -2 3.5 0 t3.5 0 t3.5 0 t3.5 0`}
          fill="none"
          stroke="#2c7da0"
          strokeWidth={1.1}
        />
      )}
    </g>
  );
}
