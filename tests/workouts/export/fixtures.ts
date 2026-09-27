import type { BikeStructure } from "@/modules/workouts/structure";

/** Warm up in zone 2, three times ten minutes in zone 4 with five in zone 1, cool down in zone 1. */
export const threshold: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 600, target: { kind: "zone", zone: 2 } },
    {
      kind: "repeat",
      times: 3,
      steps: [
        {
          kind: "step",
          intent: "work",
          seconds: 600,
          target: { kind: "zone", zone: 4 },
          cadenceLow: 85,
          cadenceHigh: 95,
        },
        { kind: "step", intent: "recover", seconds: 300, target: { kind: "zone", zone: 1 } },
      ],
    },
    { kind: "step", intent: "cooldown", seconds: 600, target: { kind: "zone", zone: 1 } },
  ],
};

/** One of every other kind of target: a share of FTP, of threshold pulse, an RPE, and none. */
export const mixed: BikeStructure = {
  kind: "bike",
  steps: [
    {
      kind: "step",
      intent: "steady",
      seconds: 1200,
      target: { kind: "ftp_pct", low: 70, high: 80 },
      label: "Tempo & <cadence>",
    },
    { kind: "step", intent: "steady", seconds: 900, target: { kind: "hr_pct", low: 81, high: 89 } },
    { kind: "step", intent: "work", seconds: 60, target: { kind: "rpe", value: 9 } },
    { kind: "step", intent: "cooldown", seconds: 300, target: { kind: "open" } },
  ],
};
