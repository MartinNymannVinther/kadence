"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { runAction } from "@/core/action";
import { installKadenceContent } from "./kadence-library";

/** Kadence's sessions, programmes and weeks for an adult into the library (ADR 0092). */
export async function installKadenceContentAction(raw: unknown = {}) {
  const locale = (await getLocale()) === "en" ? "en" : "da";
  return runAction(raw, z.object({}), (ctx) => installKadenceContent(ctx, locale), ["/library"]);
}
