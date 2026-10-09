"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { searchIndex } from "./service";

/**
 * Søg's index, asked for by the palette the first time it opens. It takes
 * nothing from the browser — who the caller is decides what is in it — so
 * anything sent along is refused rather than ignored.
 */
const Nothing = z.object({}).strict();

export async function searchIndexAction(raw: unknown) {
  return runAction(raw, Nothing, (ctx) => searchIndex(ctx));
}
