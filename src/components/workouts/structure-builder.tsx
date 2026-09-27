"use client";

import type { Structure } from "@/modules/workouts/structure";
import { BikeBuilder } from "./bike-builder";
import { OtherBuilder } from "./other-builder";
import { StrengthBuilder } from "./strength-builder";

/** The builder for a structure's own kind. */
export function StructureBuilder({
  structure,
  onChange,
}: {
  structure: Structure;
  onChange: (structure: Structure) => void;
}) {
  if (structure.kind === "bike") return <BikeBuilder structure={structure} onChange={onChange} />;
  if (structure.kind === "strength")
    return <StrengthBuilder structure={structure} onChange={onChange} />;
  return <OtherBuilder structure={structure} onChange={onChange} />;
}
