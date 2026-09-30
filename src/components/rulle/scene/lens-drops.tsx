import { hash } from "@/modules/rulle";

/**
 * Washer fluid on the lens (ADR 0034): a few drops at the left edge of the
 * picture, where the car went by, and one or two at the right, that run a
 * little and dry. Drawn over the landscape but inside the band between the
 * numbers and the bar, so they never cover what a rider reads. `seed`
 * makes each spray its own; never shown to a rider who asked for less
 * motion.
 */
export function LensDrops({ seed, top, bottom }: { seed: number; top: number; bottom: number }) {
  const drops = Array.from({ length: 9 }, (_, i) => {
    const right = i >= 7;
    return {
      side: right ? "right" : "left",
      inset: `${2 + hash(seed, i, 1) * (right ? 6 : 16)}%`,
      from: `${8 + hash(seed, i, 2) * 70}%`,
      size: 10 + hash(seed, i, 3) * 22,
      delay: hash(seed, i, 4) * 0.35,
    };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top, bottom }}>
      {drops.map((drop, i) => (
        <span
          key={i}
          className="animate-rulle-drop absolute rounded-full opacity-0"
          style={{
            [drop.side]: drop.inset,
            top: drop.from,
            width: drop.size,
            height: drop.size * 1.15,
            animationDelay: `${drop.delay}s`,
            background:
              "radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.85), rgb(230 238 240 / 0.35) 45%, rgb(200 214 220 / 0.12) 70%, transparent 72%)",
            boxShadow: "inset -1px -2px 3px rgb(80 90 95 / 0.18)",
          }}
        />
      ))}
    </div>
  );
}
