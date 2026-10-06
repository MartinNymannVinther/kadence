import type { FuelItemId } from "@/modules/calc/fuel-items";

const EDGE = "#00000033";

function Bowl({ fill = "#f4f1ea", children }: { fill?: string; children: React.ReactNode }) {
  return (
    <>
      {children}
      <path d="M4 16 H28 Q27 27 16 28 Q5 27 4 16 Z" fill={fill} stroke={EDGE} strokeWidth="0.8" />
      <path d="M7 19 Q16 21 25 19" fill="none" stroke="#ffffff99" strokeWidth="1.2" />
    </>
  );
}

function Carton({ body, band }: { body: string; band: string }) {
  return (
    <>
      <path d="M10 10 L13 5 H19 L22 10 Z" fill={body} stroke={EDGE} strokeWidth="0.8" />
      <rect
        x="10"
        y="10"
        width="12"
        height="19"
        rx="1"
        fill={body}
        stroke={EDGE}
        strokeWidth="0.8"
      />
      <rect x="10" y="16" width="12" height="6" fill={band} />
      <rect x="15" y="3.5" width="3" height="2" rx="0.5" fill="#3a3a44" />
    </>
  );
}

/**
 * The meals drawn small, in the pantry's style: a bowl of oats, rice or
 * pasta, a slice of white or rye bread, a carton of milk or chocolate
 * milk, a glass of juice, a jar of honey, a cup of skyr, potatoes,
 * raisins, chicken, an egg and cheese. The banana is the bike's.
 */
export function MealIcon({ id }: { id: FuelItemId }) {
  switch (id) {
    case "oats":
      return (
        <Bowl fill="#d9c8a8">
          <g fill="#ecdfc3" stroke="#c9b48a" strokeWidth="0.5">
            <ellipse cx="10" cy="15.5" rx="2.6" ry="1.4" />
            <ellipse cx="15" cy="14.6" rx="2.6" ry="1.4" />
            <ellipse cx="20" cy="15.4" rx="2.6" ry="1.4" />
            <ellipse cx="24" cy="15.8" rx="2" ry="1.2" />
          </g>
        </Bowl>
      );
    case "rice":
      return (
        <Bowl fill="#cfe0ea">
          <path d="M6 16 Q16 8 26 16 Z" fill="#fbfaf6" stroke={EDGE} strokeWidth="0.5" />
          <g fill="#e2ddd0">
            <ellipse cx="12" cy="14" rx="1" ry="0.5" />
            <ellipse cx="16" cy="12.5" rx="1" ry="0.5" />
            <ellipse cx="20" cy="14" rx="1" ry="0.5" />
          </g>
        </Bowl>
      );
    case "pasta":
      return (
        <Bowl fill="#e8eef2">
          <path
            d="M6 16 q2 -5 4 0 q2 -5 4 0 q2 -5 4 0 q2 -5 4 0 q2 -5 4 0"
            fill="#f0cf5a"
            stroke="#c9a12a"
            strokeWidth="0.8"
          />
          <circle cx="15" cy="11.5" r="1.4" fill="#4a8a3a" />
        </Bowl>
      );
    case "whiteBread":
      return (
        <path
          d="M7 15 Q5 7 11 6 Q16 4 21 6 Q27 7 25 15 V27 H7 Z"
          fill="#f6e3b8"
          stroke="#c8913f"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case "ryeBread":
      return (
        <>
          <rect
            x="6"
            y="8"
            width="20"
            height="18"
            rx="2"
            fill="#6b4a32"
            stroke="#4d3423"
            strokeWidth="1.5"
          />
          <g fill="#b69168">
            <circle cx="11" cy="13" r="1" />
            <circle cx="17" cy="12" r="1" />
            <circle cx="21" cy="17" r="1" />
            <circle cx="13" cy="20" r="1" />
            <circle cx="19" cy="22" r="1" />
          </g>
        </>
      );
    case "milk":
      return <Carton body="#f7f8fa" band="#5fb3e0" />;
    case "cocoaMilk":
      return <Carton body="#8a5a3c" band="#f4e6d6" />;
    case "juice":
      return (
        <>
          <path d="M9 7 H23 L21 28 H11 Z" fill="#ffffffaa" stroke={EDGE} strokeWidth="0.8" />
          <path d="M9.8 11 H22.2 L21 28 H11 Z" fill="#f7a531" />
          <circle cx="22" cy="8" r="4" fill="#ffc35a" stroke="#e08a1a" strokeWidth="0.8" />
          <path d="M22 4.5 V11.5 M18.5 8 H25.5" stroke="#e08a1a" strokeWidth="0.6" />
        </>
      );
    case "honey":
      return (
        <>
          <rect
            x="8"
            y="10"
            width="16"
            height="18"
            rx="4"
            fill="#f2b705"
            stroke="#c48a00"
            strokeWidth="0.8"
          />
          <rect x="9" y="6" width="14" height="5" rx="1.5" fill="#8a5a3c" />
          <rect x="11" y="16" width="10" height="6" rx="1" fill="#fff4cc" />
        </>
      );
    case "skyr":
      return (
        <>
          <path d="M7 10 H25 L23 27 H9 Z" fill="#f7f9fb" stroke={EDGE} strokeWidth="0.8" />
          <rect
            x="6"
            y="7"
            width="20"
            height="4"
            rx="1"
            fill="#a9c7e8"
            stroke={EDGE}
            strokeWidth="0.6"
          />
          <path d="M8.6 17 H23.4 L23 20 H9 Z" fill="#a9c7e8" />
        </>
      );
    case "potatoes":
      return (
        <g fill="#c89a5b" stroke="#9c7238" strokeWidth="0.8">
          <ellipse cx="12" cy="19" rx="7" ry="5.5" />
          <ellipse cx="21" cy="14" rx="6.5" ry="5" />
          <circle cx="10" cy="18" r="0.7" fill="#9c7238" />
          <circle cx="22" cy="13" r="0.7" fill="#9c7238" />
        </g>
      );
    case "raisins":
      return (
        <g fill="#6b3b52" stroke="#4a2638" strokeWidth="0.6">
          <ellipse cx="11" cy="19" rx="3.4" ry="2.8" />
          <ellipse cx="17" cy="21" rx="3.4" ry="2.8" />
          <ellipse cx="22" cy="17" rx="3.2" ry="2.6" />
          <ellipse cx="14" cy="14" rx="3.2" ry="2.6" />
          <ellipse cx="19" cy="11.5" rx="3" ry="2.4" />
        </g>
      );
    case "chicken":
      return (
        <>
          <path
            d="M6 18 Q6 9 16 8 Q26 8 26 16 Q25 24 15 24 Q7 24 6 18 Z"
            fill="#e3a76f"
            stroke="#b9773d"
            strokeWidth="0.8"
          />
          <path d="M11 13 L17 19 M15 11 L21 17 M19 10 L24 15" stroke="#b9773d" strokeWidth="1.2" />
        </>
      );
    case "egg":
      return (
        <>
          <ellipse cx="16" cy="17" rx="9" ry="11" fill="#fbf8f0" stroke={EDGE} strokeWidth="0.8" />
          <circle cx="16" cy="19" r="5" fill="#f5b72a" />
        </>
      );
    case "cheese":
      return (
        <>
          <path d="M4 22 L26 12 L28 22 Z" fill="#f2cc55" stroke="#c99a1a" strokeWidth="0.8" />
          <path d="M4 22 H28 V26 H4 Z" fill="#e8b93a" stroke="#c99a1a" strokeWidth="0.8" />
          <g fill="#d9a832">
            <circle cx="20" cy="18" r="1.4" />
            <circle cx="13" cy="20" r="1" />
            <circle cx="24" cy="24" r="1" />
          </g>
        </>
      );
    default:
      return null;
  }
}
