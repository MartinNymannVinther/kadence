import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import type { DcuCategory } from "@/modules/dcu";
import { askForJson, modelConfigured, NoModel } from "@/modules/ai/service";
import { requireCoach } from "@/modules/team/access";
import { teamParadigm } from "@/modules/team/settings";
import { libraryCatalogue } from "../library";
import type { ProgramDraft } from "../program-draft";
import type { Translate } from "../resolve";
import { readProgramAnswer, type ProgramProposal, type Turn } from "./answer";
import { catalogueLines, refLookup } from "./catalogue";
import { buildProgramPrompt } from "./prompt";

export type { ProgramProposal, Turn };

/**
 * One turn of "Byg med AI" for a programme (ADR 0071): the coach's words,
 * the programme in the builder and the turns before go to the model with
 * the team's library, and what comes back is read into the builder's
 * shape with every exercise checked against that library. A read on its
 * own route (ADR 0034): nothing is saved until the coach presses Gem
 * (dogma 5). The class is the coach's choice in the panel, not read from
 * any rider, so no rider's data goes in and the team's switch for
 * riders' data is not asked. Composing is a coach's (ADR 0010), and so is
 * this.
 */

export type ProgramTurnInput = {
  text: string;
  draft: ProgramDraft;
  turns: Turn[];
  category: DcuCategory | null;
};

export async function proposeProgramTurn(
  ctx: OrgContext,
  input: ProgramTurnInput,
  t: Translate,
  locale: string,
): Promise<{ proposal: ProgramProposal; engine: string } | null> {
  const guided = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return (await teamParadigm(tx, ctx.orgId)) !== null;
  });
  if (!(await modelConfigured(ctx))) throw new NoModel();
  const { exercises } = await libraryCatalogue(ctx, t, locale);
  const { data, engine } = await askForJson(
    ctx,
    "build_program",
    buildProgramPrompt({
      catalogue: catalogueLines(exercises),
      draft: input.draft,
      turns: input.turns,
      text: input.text,
      category: input.category,
      locale,
      guided,
    }),
    { maxTokens: 3000 },
  );
  const proposal = readProgramAnswer(data, refLookup(exercises));
  return proposal ? { proposal, engine } : null;
}
