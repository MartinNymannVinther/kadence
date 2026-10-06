"use server";

import { z } from "zod";
import { runFeatureAction } from "@/core/feature-gate";
import { addChampion, crownChampions, removeChampion } from "./champions";
import { addRound, createChampionship, removeRound, saveRoundEntries } from "./service";
import { CLUB_CLASSES, ROUND_KINDS, type ClubClass } from "./standings";

/**
 * The club championship's actions (docs/adr/0051): each resolves the team
 * and the role first, and each is refused while the installation has the
 * championship off (docs/adr/0056).
 */

const CLUB = ["/club"];
const id = z.string().min(1).max(100);
const classes = z.enum(CLUB_CLASSES as [ClubClass, ...ClubClass[]]);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function createChampionshipAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({
      season: z.coerce.number().int().min(1900).max(2200),
      title: z.string().trim().min(1).max(120),
    }),
    createChampionship,
    CLUB,
  );
}

export async function addRoundAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({
      championshipId: id,
      heldOn: day,
      kind: z.enum(ROUND_KINDS as [string, ...string[]]),
      title: z.string().trim().min(1).max(120),
      measure: z.enum(["time", "place"]),
    }),
    addRound,
    CLUB,
  );
}

export async function removeRoundAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({ roundId: id }),
    (ctx, input) => removeRound(ctx, input.roundId),
    CLUB,
  );
}

const entry = z.object({
  riderId: id.nullable(),
  name: z.string().trim().min(1).max(120),
  class: classes,
  timeMs: z.number().int().min(1).max(86_400_000).nullable(),
  place: z.number().int().min(1).max(999).nullable(),
  status: z.enum(["finished", "dnf", "dns"]),
});

export async function saveRoundEntriesAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({ roundId: id, entries: z.array(entry).max(300) }),
    (ctx, input) => saveRoundEntries(ctx, input.roundId, input.entries),
    CLUB,
  );
}

export async function crownChampionsAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({ championshipId: id, title: z.string().trim().min(1).max(80) }),
    (ctx, input) => crownChampions(ctx, input.championshipId, input.title),
    CLUB,
  );
}

export async function addChampionAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({
      year: z.coerce.number().int().min(1900).max(2200),
      class: classes,
      title: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(120),
      riderId: id.nullable().optional(),
      note: z.string().trim().max(300).optional(),
    }),
    addChampion,
    CLUB,
  );
}

export async function removeChampionAction(raw: unknown) {
  return runFeatureAction(
    "clubChampionship",
    raw,
    z.object({ championId: id }),
    (ctx, input) => removeChampion(ctx, input.championId),
    CLUB,
  );
}
