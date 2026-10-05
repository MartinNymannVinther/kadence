import { useTranslations } from "next-intl";

/**
 * Team Danmark's two plates (ernaering.md 1.1): the "Elite" plate — half
 * carbohydrate, a quarter protein, a quarter vegetables — on days with
 * 1½ hours of hard training or more, and Fødevarestyrelsen's Y-plate —
 * two fifths carbohydrate, one fifth protein, two fifths vegetables — on
 * others.
 */
const PLATES = {
  elite: { carbs: 1 / 2, protein: 1 / 4, greens: 1 / 4 },
  everyday: { carbs: 2 / 5, protein: 1 / 5, greens: 2 / 5 },
} as const;

const COLOUR = { carbs: "#e8bf72", protein: "#d9785a", greens: "#7fb27f" } as const;
const PARTS = ["carbs", "protein", "greens"] as const;

/** Trigonometry may differ in its last digit between the server and the browser. */
const q = (n: number) => Math.round(n * 100) / 100;

function wedge(from: number, to: number, r: number) {
  const a = (f: number) => f * 2 * Math.PI - Math.PI / 2;
  const [x1, y1] = [q(Math.cos(a(from)) * r), q(Math.sin(a(from)) * r)];
  const [x2, y2] = [q(Math.cos(a(to)) * r), q(Math.sin(a(to)) * r)];
  return `M0 0 L${x1} ${y1} A${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

/** The plate for the main meal after, drawn with its shares and named. */
export function EnergyPlate({ plate }: { plate: "elite" | "everyday" }) {
  const t = useTranslations("calculators.energy.plate");
  const shares = PLATES[plate];
  const wedges = PARTS.map((part, i) => {
    const from = PARTS.slice(0, i).reduce((sum, p) => sum + shares[p], 0);
    return { part, d: wedge(from, from + shares[part], 30) };
  });

  return (
    <div className="bg-secondary/60 flex items-center gap-4 rounded-lg p-3">
      <svg viewBox="-36 -36 72 72" className="size-20 shrink-0" aria-hidden>
        <circle r={35} fill="#ffffff" stroke="#00000022" />
        {wedges.map((w) => (
          <path key={w.part} d={w.d} fill={COLOUR[w.part]} stroke="#ffffff" strokeWidth={1.5} />
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        <span className="text-2sm font-semibold">{t(`${plate}.title`)}</span>
        <span className="text-reading text-2sm leading-relaxed">{t(`${plate}.body`)}</span>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {PARTS.map((part) => (
            <li key={part} className="flex items-center gap-1">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: COLOUR[part] }}
              />
              {t(`parts.${part}`, { share: Math.round(shares[part] * 100) })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
