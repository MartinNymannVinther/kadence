import type { BikeStructure, Intent, Repeat, Step, Target } from "./structure";

/**
 * A coach's shorthand turned into a structured bike session, without a
 * model: "15 min opvarmning, 3x10 min Z4 / 5 min pause, 10 min nedkørsel"
 * or "2 t Z2" or "4 x 4' 110-115% FTP med 3' pause". Works offline (dogma
 * 2); the AI route is for what this does not understand, and the builder
 * always shows the result before anything is saved.
 *
 * The grammar, Danish and English:
 * - parts are separated by commas, semicolons, "+", " og ", " and " or
 *   new lines;
 * - a part is an optional repeat ("3x", "3 x", "3×"), a duration ("10
 *   min", "10'", "1,5 t", "90 s", "2h"), an optional target and an
 *   optional recovery after "/", "med", "with" or "pause";
 * - a target is a zone ("Z4", "zone 4"), a share of FTP ("95%", "90-95%
 *   FTP"), a share of threshold pulse ("85-89% puls", "% HR"), an RPE
 *   ("RPE 7"), or a word: DCU's own ("AT", "tempo", "distance", "basis")
 *   and the common ones ("rolig", "let", "VO2", "sprint", "max").
 * Words that name what a step is for — opvarmning, nedkørsel, pause —
 * set its intent and, without a target, its zone.
 *
 * Returns null when a part cannot be read, so the caller can offer the AI
 * instead of a half-right session.
 */

const WORD_ZONES: Array<[RegExp, number]> = [
  [/\b(restitution|recovery|let|easy|rolig|pause|hvile|rest)\b/i, 1],
  [/\b(distance|distancetræning|basis|grundtræning|endurance|z2-tur)\b/i, 2],
  [/\b(tempo|sweetspot|sweet spot)\b/i, 3],
  // DCU's "AT" in capitals only: Danish "at" is an everyday word.
  [/\bAT\b/, 4],
  [/\b(tærskel|threshold|ftp)\b/i, 4],
  [/\b(vo2|vo2max|vo2-max)\b/i, 5],
  [/\b(anaerob|anaerobic|max)\b/i, 6],
  [/\b(sprint|spurt)\b/i, 7],
];

const INTENT_WORDS: Array<[RegExp, Intent]> = [
  [/\b(opvarmning|warm[- ]?up|wu)\b/i, "warmup"],
  [/\b(nedkørsel|cool[- ]?down|cd|afkøling)\b/i, "cooldown"],
  [/\b(pause|hvile|rest|recovery|restitution)\b/i, "recover"],
];

const DURATION =
  /(\d+(?:[.,]\d+)?)\s*(timer|time|t|hours?|hrs?|h|minutter|min|m|'|sekunder|sek|sec|s|")(?![a-zæøå])/i;

function seconds(value: string, unit: string): number {
  const n = Number(value.replace(",", "."));
  const u = unit.toLowerCase();
  if (["timer", "time", "t", "hour", "hours", "hr", "hrs", "h"].includes(u)) return n * 3600;
  if (["sekunder", "sek", "sec", "s", '"'].includes(u)) return n;
  return n * 60;
}

function target(text: string): Target | null {
  const zone = /\b(?:z|zone\s*)([1-7])\b/i.exec(text);
  if (zone) return { kind: "zone", zone: Number(zone[1]) };
  const rpe = /\brpe\s*(\d{1,2})\b/i.exec(text);
  if (rpe && Number(rpe[1]) >= 1 && Number(rpe[1]) <= 10)
    return { kind: "rpe", value: Number(rpe[1]) };
  const pct = /(\d{2,3})(?:\s*[-–]\s*(\d{2,3}))?\s*%\s*(puls|pulse|hr|lthr|tærskelpuls)?/i.exec(
    text,
  );
  if (pct) {
    const low = Number(pct[1]);
    const high = Number(pct[2] ?? pct[1]);
    if (pct[3]) return { kind: "hr_pct", low: Math.min(low, high), high: Math.max(low, high) };
    return { kind: "ftp_pct", low: Math.min(low, high), high: Math.max(low, high) };
  }
  for (const [pattern, z] of WORD_ZONES) if (pattern.test(text)) return { kind: "zone", zone: z };
  return null;
}

function intentOf(text: string): Intent | null {
  for (const [pattern, intent] of INTENT_WORDS) if (pattern.test(text)) return intent;
  return null;
}

function step(text: string, fallbackIntent: Intent): Step | null {
  const d = DURATION.exec(text);
  if (!d) return null;
  const secs = Math.round(seconds(d[1]!, d[2]!));
  if (secs < 1 || secs > 12 * 3600) return null;
  const rest = text.replace(d[0], " ");
  const intent = intentOf(rest) ?? fallbackIntent;
  const found = target(rest);
  const fallbackZone = intent === "recover" ? 1 : intent === "work" ? 4 : 2;
  return {
    kind: "step",
    intent,
    seconds: secs,
    target: found ?? {
      kind: "zone",
      zone: intent === "warmup" || intent === "cooldown" ? 2 : fallbackZone,
    },
  };
}

function part(text: string): Step | Repeat | null {
  const repeat = /^\s*(\d{1,2})\s*[x×*]\s*(.+)$/i.exec(text);
  if (!repeat) return step(text, "steady");
  const times = Number(repeat[1]);
  if (times < 1 || times > 50) return null;
  const [work, recovery] = repeat[2]!.split(/\s*(?:\/|\bmed\b|\bwith\b|\bog\b)\s*/i, 2);
  const on = step(work ?? "", "work");
  if (!on) return null;
  if (on.intent === "steady") on.intent = "work";
  const steps: Step[] = [on];
  if (recovery) {
    const off = step(recovery, "recover");
    if (!off) return null;
    if (!target(recovery.replace(DURATION, " "))) off.target = { kind: "zone", zone: 1 };
    off.intent = "recover";
    steps.push(off);
  }
  return { kind: "repeat", times, steps };
}

export function parseWorkoutText(text: string): BikeStructure | null {
  const trimmed = text.trim().slice(0, 1000);
  if (!trimmed) return null;
  // Commas (not a decimal comma, "1,5 t"), semicolons, "+" and new lines
  // always separate; "og"/"and" separate too, except inside a repeat,
  // where "3x10 min og 5 min pause" is one part.
  const parts = trimmed
    .split(/\s*(?:,(?!\d)|(?<!\d),|[;\n+])\s*/)
    .flatMap((p) => (/^\s*\d{1,2}\s*[x×*]/i.test(p) ? [p] : p.split(/\s+(?:og|and)\s+/i)))
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 30) return null;
  const steps: Array<Step | Repeat> = [];
  for (const p of parts) {
    const parsed = part(p);
    if (!parsed) return null;
    steps.push(parsed);
  }
  return { kind: "bike", steps };
}
