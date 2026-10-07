import { createTranslator } from "next-intl";
import type { OrgContext } from "@/core/db/tenant";
import type { Translate } from "@/modules/exercises/dose";
import { scheduleProgram } from "@/modules/exercises/schedule";
import { createTeamExercise, type TeamExerciseDraft } from "@/modules/exercises/team-exercises";
import { createTeamProgram } from "@/modules/exercises/team-programs";
import type { Pose } from "@/modules/exercises/types";
import da from "../../../messages/da.json";
import en from "../../../messages/en.json";
import { pick, type L, type Text } from "./seed-data";

/**
 * Øvelser og programmer in the demo (ADR 0054, ADR 0067): a drawn exercise
 * of the team's own beside Kadence's, mixed into a programme the coach
 * built, laid into every rider's calendar today so a visitor sees a
 * session with figures without clicking anywhere first. Written through
 * the ordinary services, as the demo's coach — the same `createTeamExercise`,
 * `createTeamProgram` and `scheduleProgram` a real coach uses.
 */

/** Danish or English words for the `exercises` namespace, as a page would hand them over. */
function translatorFor(l: L): Translate {
  const messages = l === "en" ? en : da;
  return createTranslator({ locale: l, messages, namespace: "exercises" }) as unknown as Translate;
}

/**
 * Hips on a bench, legs anchored behind, chest lifted — in the shape of
 * the pose editor's prone "front" base pose (base-poses.ts), raised onto a
 * bench rather than flat on the floor. The arrow lifts the chest.
 */
const POSE: Pose = {
  joints: {
    head: [88, 68],
    neck: [108, 80],
    hip: [140, 90],
    elbowA: [112, 92],
    handA: [96, 98],
    elbowB: [112, 92],
    handB: [96, 98],
    kneeA: [172, 98],
    footA: [206, 102],
    kneeB: [172, 98],
    footB: [206, 102],
  },
  hidden: ["armB", "legB"],
  props: [
    { kind: "floor", y: 122 },
    { kind: "bench", at: [118, 92], width: 55, height: 30 },
  ],
  arrows: [{ from: [60, 102], to: [60, 76], bend: 0 }],
};

const EXERCISE_NAME: Text = { da: "Rygstræk på bænk", en: "Back extension on a bench" };
const EXERCISE_HOW: Text = {
  da: "Læg dig med hoften på bænken, strakte ben bagud og fødderne forankret. Sænk overkroppen roligt, og rejs den op igen til lige linje med benene, uden at overstrække i lænden.",
  en: "Lie with your hips on the bench, your legs straight behind you and your feet anchored. Lower your upper body slowly, then lift it back level with your legs, without overarching your lower back.",
};
const EXERCISE_WHY: Text = {
  da: "Styrker rygstrækkerne, der holder overkroppen stabil, når du rejser dig ud af sadlen eller trækker i styret.",
  en: "Strengthens the back extensors that keep your upper body stable when you stand up out of the saddle or pull on the bars.",
};

const PROGRAM_NAME: Text = {
  da: "Holdets mobilitet efter fællestræning",
  en: "The team's mobility after training together",
};
const PROGRAM_DESCRIPTION: Text = {
  da: "Et kort program med Kadences egne øvelser og holdets eget rygstræk, til efter fællesturene.",
  en: "A short programme with Kadence's own exercises and the team's own back extension, for after the group rides.",
};

/**
 * The team's own drawn exercise, a programme that mixes it with Kadence's
 * own, and that programme laid into every rider's calendar today — so a
 * visitor sees the whole feature at once: the library's "Holdets" tab,
 * the programme viewer mixing both kinds, and a session with figures on
 * the rider's own day.
 */
export async function seedTeamExercises(
  ctx: OrgContext,
  l: L,
  { today, riderIds }: { today: string; riderIds: string[] },
): Promise<void> {
  const draft: TeamExerciseDraft = {
    name: pick(EXERCISE_NAME, l),
    group: "core",
    equipment: ["bench"],
    dose: { kind: "reps", reps: 12, perSide: false, sets: 3 },
    how: pick(EXERCISE_HOW, l),
    why: pick(EXERCISE_WHY, l),
    pose: POSE,
  };
  const exercise = await createTeamExercise(ctx, draft);

  const program = await createTeamProgram(ctx, {
    name: pick(PROGRAM_NAME, l),
    description: pick(PROGRAM_DESCRIPTION, l),
    parts: [
      {
        key: "after",
        items: [
          { exercise: "builtin:catCow" },
          { exercise: "builtin:hipFlexor" },
          { exercise: "builtin:hamstringStretch" },
          { exercise: exercise.ref },
          { exercise: "builtin:figureFour" },
        ],
      },
    ],
  });

  await scheduleProgram(
    ctx,
    { program: `team:${program.id}`, riderIds, onDate: today },
    translatorFor(l),
  );
}
