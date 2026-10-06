"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { ApplyInput, applyBlock, previewBlock } from "./block-apply";
import { archiveBlock, BlockInput, createBlock, updateBlock } from "./blocks";

/** The blocks' server actions: keep a block, preview it for riders, put it in their calendars. */

const PATHS = ["/library", "/calendar", "/today"];
const ById = z.object({ blockId: z.string().min(1).max(100) });

export async function createBlockAction(raw: unknown) {
  return runAction(raw, BlockInput, createBlock, PATHS);
}

export async function updateBlockAction(raw: unknown) {
  return runAction(
    raw,
    ById.extend({ block: BlockInput }),
    (ctx, input) => updateBlock(ctx, input.blockId, input.block),
    PATHS,
  );
}

export async function archiveBlockAction(raw: unknown) {
  return runAction(
    raw,
    ById.extend({ archived: z.boolean() }),
    (ctx, input) => archiveBlock(ctx, input.blockId, input.archived),
    PATHS,
  );
}

export async function previewBlockAction(raw: unknown) {
  return runAction(raw, ApplyInput, previewBlock, []);
}

export async function applyBlockAction(raw: unknown) {
  return runAction(raw, ApplyInput, applyBlock, PATHS);
}
