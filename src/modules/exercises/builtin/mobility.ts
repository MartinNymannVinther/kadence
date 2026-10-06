import type { BuiltinExercise } from "../types";

/**
 * Kneeling hip-flexor stretch: the shape every pose follows. Torso upright
 * over the back knee, the front thigh level, the hand on the hip, the
 * arrow pushing the hip forward.
 */
export const HIP_FLEXOR: BuiltinExercise = {
  id: "hipFlexor",
  group: "mobility",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: "Static stretches held about 30 s; ACSM, Garber et al. 2011, Med Sci Sports Exerc 43(7)",
  pose: {
    joints: {
      head: [120, 26],
      neck: [120, 39],
      hip: [122, 90],
      elbowA: [138, 62],
      handA: [125, 84],
      elbowB: [138, 62],
      handB: [125, 84],
      kneeA: [80, 90],
      footA: [80, 121],
      kneeB: [150, 121],
      footB: [194, 121],
    },
    hidden: ["armB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [164, 92], to: [140, 92], bend: 0 }],
  },
};
