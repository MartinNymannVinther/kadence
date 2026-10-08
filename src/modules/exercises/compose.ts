import {
  doseSchema,
  LOADS,
  PART_KEYS,
  programPartsSchema,
  type Dose,
  type Load,
  type ProgramPart,
} from "./types";

/**
 * "Sammensæt dit eget" (docs/plan-ovelser-og-programmer.md): a programme a
 * reader builds from Kadence's own exercises, carried as a compact string
 * in the `c` query parameter so it can be shared and nothing is stored
 * about anyone. Only built-in exercises — the open page never puts a
 * team's own exercise in a link that leaves the team.
 *
 * Grammar: parts separated by ";"; a part is its key, "=", then its items
 * separated by ","; an item is a built-in exercise's id and, when its dose
 * differs from the exercise's own, "-" and a dose code. A dose code is
 * "t" (time) or "r" (reps), the amount, "s" when per side, "x" with the
 * sets when more than one, and the load's first letter when it has one —
 * "l" light, "m" moderate, "h" heavy: "t30sx3" is 30 seconds per side, 3
 * sets, and "r10x3m" is 3 × 10 at a moderate load.
 * "squat;plank-t60x2" is the part "any" (a bare id is never seen alone —
 * every item sits under a part) — in practice: "any=squat,plank-t60x2".
 *
 * Decoding never throws: a string that does not fit — too long, too many
 * items, an id or a number outside the contract, a part used twice — comes
 * back as null, and the page falls back rather than showing a broken one.
 *
 * Pure: imports nothing from the database.
 */

/** Well short of what a URL and a phone screen can carry comfortably. */
export const COMPOSE_MAX_LENGTH = 2000;
/** Across every part together; the contract already bounds each part to 20. */
export const COMPOSE_MAX_ITEMS = 40;

const BUILTIN_PREFIX = "builtin:";
const BUILTIN_ID = /^[a-z][a-zA-Z0-9]{1,40}$/;
const DOSE_CODE = /^(t|r)(\d{1,4})(s)?(?:x(\d{1,2}))?([lmh])?$/;
/** A load by its first letter, which the three words do not share. */
const LOAD_BY_LETTER = new Map<string, Load>(LOADS.map((load) => [load[0]!, load]));

function encodeDose(dose: Dose): string {
  const amount = dose.kind === "time" ? dose.seconds : dose.reps;
  const sets = dose.sets ?? 1;
  const perSide = dose.perSide ?? false;
  const kind = dose.kind === "time" ? "t" : "r";
  const load = dose.load ? dose.load[0] : "";
  return `${kind}${amount}${perSide ? "s" : ""}${sets > 1 ? `x${sets}` : ""}${load}`;
}

function decodeDose(code: string): Dose | null {
  const match = DOSE_CODE.exec(code);
  if (!match) return null;
  const [, kind, amountRaw, perSideFlag, setsRaw, loadLetter] = match;
  const amount = Number(amountRaw);
  const sets = setsRaw ? Number(setsRaw) : 1;
  const load = loadLetter ? { load: LOAD_BY_LETTER.get(loadLetter) } : {};
  const draft =
    kind === "t"
      ? { kind: "time" as const, seconds: amount, perSide: Boolean(perSideFlag), sets, ...load }
      : { kind: "reps" as const, reps: amount, perSide: Boolean(perSideFlag), sets, ...load };
  const parsed = doseSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}

/** The compact string a composition decodes back from; a non-built-in reference is left out. */
export function encodeComposition(parts: readonly ProgramPart[]): string {
  return parts
    .map((part) => {
      const items = part.items
        .filter((item) => item.exercise.startsWith(BUILTIN_PREFIX))
        .map((item) => {
          const id = item.exercise.slice(BUILTIN_PREFIX.length);
          return item.dose ? `${id}-${encodeDose(item.dose)}` : id;
        });
      return items.length > 0 ? `${part.key}=${items.join(",")}` : null;
    })
    .filter((part): part is string => part !== null)
    .join(";");
}

/** Decodes a `c` query value to a programme's parts, or null when it does not fit the contract. */
export function decodeComposition(raw: string): ProgramPart[] | null {
  if (!raw || raw.length > COMPOSE_MAX_LENGTH) return null;
  const partTokens = raw.split(";");
  if (partTokens.length > PART_KEYS.length) return null;

  const seenKeys = new Set<string>();
  const parts: ProgramPart[] = [];
  let total = 0;

  for (const token of partTokens) {
    const eq = token.indexOf("=");
    if (eq < 1) return null;
    const key = token.slice(0, eq);
    if (!(PART_KEYS as readonly string[]).includes(key) || seenKeys.has(key)) return null;
    seenKeys.add(key);

    const items: ProgramPart["items"] = [];
    for (const itemToken of token.slice(eq + 1).split(",")) {
      if (!itemToken) return null;
      total += 1;
      if (total > COMPOSE_MAX_ITEMS) return null;

      const dash = itemToken.indexOf("-");
      const id = dash < 0 ? itemToken : itemToken.slice(0, dash);
      if (!BUILTIN_ID.test(id)) return null;

      if (dash < 0) {
        items.push({ exercise: `${BUILTIN_PREFIX}${id}` });
        continue;
      }
      const dose = decodeDose(itemToken.slice(dash + 1));
      if (!dose) return null;
      items.push({ exercise: `${BUILTIN_PREFIX}${id}`, dose });
    }
    parts.push({ key: key as ProgramPart["key"], items });
  }

  const checked = programPartsSchema.safeParse(parts);
  return checked.success ? checked.data : null;
}
