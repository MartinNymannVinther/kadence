"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { runAction } from "@/core/action";
import { installDcuProgrammes } from "./dcu-library";

/** DCU's strength programmes into the library, in the reader's language. */
export async function installDcuProgrammesAction(raw: unknown = {}) {
  const locale = (await getLocale()) === "en" ? "en" : "da";
  return runAction(raw, z.object({}), (ctx) => installDcuProgrammes(ctx, locale), ["/library"]);
}
