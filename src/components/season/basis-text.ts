import { basisParts, isClassBasis } from "@/modules/dcu";
import { isSeniorBasis, profileOf } from "@/modules/paradigms";

/**
 * A column of DCU's table in words — "U19 1. år" — from its basis,
 * "U19-1", or a senior's training profile — "Motionist" — from
 * "senior-motionist" (docs/adr/0091). An unknown basis reads as nothing
 * rather than as its code.
 */
type Translate = (key: "basis" | "basisSenior", values: Record<string, string | number>) => string;

export function basisText(basis: string | null | undefined, t: Translate): string {
  if (isSeniorBasis(basis)) return t("basisSenior", { profile: profileOf(basis) });
  if (!isClassBasis(basis)) return "";
  const { category, yearInClass } = basisParts(basis);
  return t("basis", { category, year: yearInClass });
}
