import { z } from "zod";
import { MISTRAL_EU_BASE_URL } from "@/core/llm/mistral";

/**
 * These URLs are built in docker-compose.yml by pasting a password into
 * `postgres://user:PASSWORD@db:5432/kadence`, so a password containing a
 * slash ends the authority part of the URL and the rest becomes
 * nonsense. `openssl rand -base64` emits `/`, `+` and `=`, which is why
 * the deploy guide asks for hex here. Without this hint the error names
 * the URL, and the person who has to fix it set a password.
 */
const DB_URL_HINT =
  "must be a valid postgres:// URL. If you generated the password with `openssl rand -base64`, " +
  "a `/`, `+` or `=` in it breaks the URL: use `openssl rand -hex 24` instead.";

/** The value shipped in .env.example. Refused in production, by name. */
const PLACEHOLDER_SECRET = "dev-only-secret-change-me-in-production";

/**
 * Server-side environment variables, validated at the boundary.
 * Import this instead of reading process.env directly.
 */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_DATABASE_URL: z.url({ error: DB_URL_HINT }),
    AUTH_DATABASE_URL: z.url({ error: DB_URL_HINT }),
    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    // Other origins the browser may sign in from, comma-separated: a
    // machine's network name while developing, a second hostname in
    // front of one installation. Better Auth refuses every origin it
    // was not told about, which is right, and which is why this exists
    // rather than a wildcard. Passkeys stay bound to BETTER_AUTH_URL.
    AUTH_TRUSTED_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).max(20)),
    // LLM adapter (CLAUDE.md: EU-hosted or local models behind an
    // adapter): "mistral" (EU-hosted API), "ollama" (local or
    // self-hosted, Ollama-compatible) or "none" to disable AI features.
    LLM_PROVIDER: z.enum(["mistral", "ollama", "none"]).default("none"),
    // Secret. Lives only in .env locally and in Coolify in production.
    MISTRAL_API_KEY: z.string().min(1).optional(),
    // Model override; sensible per-provider defaults apply when unset.
    LLM_MODEL: z.string().min(1).optional(),
    OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
    // Which Mistral endpoint to call. Defaults to the EU one, which is
    // what dogma four and docs/subprocessors.md commit this installation
    // to; api.mistral.ai carries no location commitment at all. Like the
    // Ollama address this belongs to the installation, so a workspace
    // cannot move where its project text is processed.
    MISTRAL_BASE_URL: z.url().default(MISTRAL_EU_BASE_URL),
    // Who may create an account: "closed" (the default) admits nobody once
    // the first user exists, "open" lets anyone register. See
    // src/core/auth/signup.ts.
    SIGNUP: z.enum(["closed", "open"]).default("closed"),
    // A demo workspace per visitor, seeded and thrown away after a day.
    // Off by default: an installation running real work should not hand
    // out accounts, and the route answers 404 while this is "off".
    DEMO: z.enum(["off", "on"]).default("off"),
    // Each workspace's AI budget for a calendar month, in micro-euro
    // (1 € = 1,000,000), counted from what the installation's own key
    // spent (src/modules/ai/limits.ts, docs/adr/0089). A workspace over it
    // is told the AI is resting until next month and everything else
    // works; the installation's owner can give a workspace another budget
    // under Indstillinger → Installation. 5 € is a few thousand proposals
    // on Mistral Small. 0 turns budgets off — the honest setting for a
    // self-hoster on Ollama, where a call costs nothing.
    AI_MONTHLY_BUDGET_MICRO: z.coerce
      .number()
      .int()
      .min(0)
      .max(1_000_000_000_000)
      .default(5_000_000),
    // An optional emergency roof on model calls in any 24 hours, counted
    // across every workspace (ADR 0009). Off (0) by default since the
    // monthly budget per workspace took over its job (docs/adr/0089): a
    // shared roof let one busy club close the AI for everybody. Set it
    // when something is running away and you want a hard stop today.
    AI_DAILY_CALL_CAP: z.coerce.number().int().min(0).max(1_000_000).default(0),
    // How many proxies in front of Kadence append to X-Forwarded-For. The
    // rightmost entries are the ones your own infrastructure wrote and are
    // therefore the only ones worth trusting; everything to the left of
    // them was supplied by the caller. Coolify/Traefik is one hop, which
    // is the default. At 0 no forwarded header is read at all, and every
    // caller shares one bucket, because Next does not hand a route the
    // connection's own address. See src/core/rate-limit.ts.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(8).default(1),
    // Wahoo, Garmin and Polar (src/modules/devices). External services —
    // Wahoo and Garmin US companies, Polar a Finnish one: a rider chooses
    // to connect their own account, and without these keys the device
    // settings say so while FIT upload, the calendar and everything else
    // work as before (dogma 2). A provider's client id and secret come as
    // a pair or not at all.
    // Secrets: they live only in .env locally and in Coolify in production.
    WAHOO_CLIENT_ID: z.string().min(1).optional(),
    WAHOO_CLIENT_SECRET: z.string().min(1).optional(),
    // The value Wahoo echoes in every webhook, chosen in Wahoo's developer
    // portal. Without it the webhook refuses everything, because it is the
    // only proof a notification came from Wahoo.
    WAHOO_WEBHOOK_TOKEN: z.string().min(16).optional(),
    GARMIN_CLIENT_ID: z.string().min(1).optional(),
    GARMIN_CLIENT_SECRET: z.string().min(1).optional(),
    // Polar's AccessLink (Polar Electro Oy, Finland). The client id and
    // secret come from admin.polaraccesslink.com; the webhook secret is the
    // `signature_secret_key` AccessLink answers with, once, when the
    // installation's webhook is created (docs/devices-setup.md). Without it
    // every Polar notification is refused, because the signature it checks
    // is the only proof a notification came from Polar.
    POLAR_CLIENT_ID: z.string().min(1).optional(),
    POLAR_CLIENT_SECRET: z.string().min(1).optional(),
    POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
    // The map behind a ride's route: a PMTiles file of OpenStreetMap data
    // on this server (scripts/fetch-map.sh, ADR 0023). Served by Kadence
    // itself, so no rider's position reaches a map service. Without it the
    // route is drawn on plain paper, as before.
    MAP_FILE: z.string().min(1).optional(),
    // A rider's races and results from Cykling Danmark's member portal
    // (src/modules/results, ADR 0039), read from the rider's public page
    // by the UCI ID a coach entered. An external service, and one that has
    // not yet said yes: "off" (the default) reads nothing, and the coach
    // sees a link to the rider's page instead; "on" reads it for every
    // rider with a UCI ID; a comma-separated list of UCI IDs reads it for
    // those riders only, the way to try it with one rider first.
    DCU_RESULTS: z
      .string()
      .transform((v) => v.replace(/\s/g, ""))
      .pipe(z.union([z.enum(["off", "on"]), z.string().regex(/^[0-9]{11}(,[0-9]{11})*$/)]))
      .default("off"),
    // Parts of Kadence an installation may park until a real winter with a
    // real team has used the rest (docs/adr/0057, src/core/features.ts).
    // Each is "on" by default (Martin's choice, 6 October 2026) and "off"
    // parks it whole: the menu, the pages, the actions and the demo.
    // Nothing is removed by turning one off; the data stays.
    // Rulle's land, towns, people and sound behind the session; without it
    // Rulle is the session alone: the bar, the numbers and the trainer.
    RULLE_WORLD: z.enum(["off", "on"]).default("on"),
    // Trænerrummet, the coaches' room across the installation's teams (ADR 0052).
    COACHES_ROOM: z.enum(["off", "on"]).default("on"),
    // The club championship (ADR 0051); a team still turns it on for itself.
    CLUB_CHAMPIONSHIP: z.enum(["off", "on"]).default("on"),
    // The energy calculator among the open guides (ADR 0047).
    CALC_ENERGY: z.enum(["off", "on"]).default("on"),
    // The food guide, health advice about minors. Its section on low energy
    // availability has not yet been read by a sports dietitian (ADR 0047);
    // "off" holds it back until one has.
    GUIDE_FOOD: z.enum(["off", "on"]).default("on"),
    // The open page of Danish U19 and U23 teams (ADR 0072), read from the
    // UCI and from Cykling Danmark once a day into TEAMS_DIR.
    GUIDE_TEAMS: z.enum(["off", "on"]).default("on"),
    // Whether that page reads Cykling Danmark's team list and points lists
    // (src/modules/teams/dcu). An external service that has not yet said
    // yes to being read: "off" leaves the page with the UCI's part alone.
    TEAMS_DCU: z.enum(["off", "on"]).default("on"),
    // Where the teams page keeps what it last read; ./data/teams unless set.
    TEAMS_DIR: z.string().min(1).optional(),
    // Reminders by web push (docs/adr/0060). The push carries no content;
    // Apple's, Google's or Mozilla's push service, whichever the person's
    // browser uses, sees that a reminder went out and when, never what it
    // says (docs/subprocessors.md). Without the key pair nothing is sent
    // and everything else works. `npx web-push generate-vapid-keys` is not
    // needed: `pnpm script scripts/push-keys.ts` prints a pair.
    // Secret: the private key lives only in .env locally and in Coolify.
    PUSH_PUBLIC_KEY: z.string().min(80).optional(),
    PUSH_PRIVATE_KEY: z.string().min(40).optional(),
    // Who the push services may contact about this installation's pushes.
    PUSH_CONTACT: z
      .string()
      .regex(/^(mailto:|https:\/\/)/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    // `next build` runs with NODE_ENV=production and placeholder values
    // for everything it must import, because a build has no database and
    // no secrets. It is not an installation, so it is not held to an
    // installation's standards; the checks below are for a process that
    // is about to serve requests.
    const building = process.env.NEXT_PHASE === "phase-production-build";
    // The placeholder is published in .env.example, and this secret does
    // not only sign sessions: it derives the key that encrypts every
    // workspace's model API key (src/core/crypto/secret-box.ts). An
    // installation that went live on the example value would be handing
    // both away. Documentation is not a control, so this is one.
    if (value.NODE_ENV === "production" && !building) {
      // Coolify pre-fills every variable with the compose file's `:?`
      // message as its value, so "set BETTER_AUTH_SECRET" arrives here
      // looking like a choice. It is short enough to fail the length rule
      // too, but the length rule's message would send the operator to the
      // wrong fix.
      if (/^\s*set\s+[A-Z][A-Z0-9_]*\b/.test(value.BETTER_AUTH_SECRET)) {
        ctx.addIssue({
          code: "custom",
          message:
            "BETTER_AUTH_SECRET holds the compose file's placeholder text, not a secret. Coolify fills every variable with the message after `:?` in docker-compose.yml; replace it with `openssl rand -base64 32`, and check the database passwords the same way.",
          path: ["BETTER_AUTH_SECRET"],
        });
      } else if (
        value.BETTER_AUTH_SECRET === PLACEHOLDER_SECRET ||
        value.BETTER_AUTH_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "BETTER_AUTH_SECRET must be at least 32 characters and not the value from .env.example in production. Generate one with: openssl rand -base64 32",
          path: ["BETTER_AUTH_SECRET"],
        });
      }
      if (!value.BETTER_AUTH_URL.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          message:
            "BETTER_AUTH_URL must be an https:// address in production; passkeys and secure cookies are bound to it",
          path: ["BETTER_AUTH_URL"],
        });
      }
    }
    if (value.LLM_PROVIDER === "mistral" && !value.MISTRAL_API_KEY) {
      ctx.addIssue({
        code: "custom",
        message: "LLM_PROVIDER=mistral requires MISTRAL_API_KEY",
        path: ["LLM_PROVIDER"],
      });
    }
    // Half a provider is a connect button that fails at the provider's
    // door, which the rider would take for Kadence being broken. Refused
    // at start instead, naming the missing half.
    for (const [id, secret] of [
      ["WAHOO_CLIENT_ID", "WAHOO_CLIENT_SECRET"],
      ["GARMIN_CLIENT_ID", "GARMIN_CLIENT_SECRET"],
      ["POLAR_CLIENT_ID", "POLAR_CLIENT_SECRET"],
    ] as const) {
      if (Boolean(value[id]) !== Boolean(value[secret])) {
        ctx.addIssue({
          code: "custom",
          message: `${id} and ${secret} go together: set both to connect, or neither`,
          path: [value[id] ? secret : id],
        });
      }
    }
    if (value.WAHOO_WEBHOOK_TOKEN && !value.WAHOO_CLIENT_ID) {
      ctx.addIssue({
        code: "custom",
        message: "WAHOO_WEBHOOK_TOKEN does nothing without WAHOO_CLIENT_ID and WAHOO_CLIENT_SECRET",
        path: ["WAHOO_WEBHOOK_TOKEN"],
      });
    }
    if (Boolean(value.PUSH_PUBLIC_KEY) !== Boolean(value.PUSH_PRIVATE_KEY)) {
      ctx.addIssue({
        code: "custom",
        message:
          "PUSH_PUBLIC_KEY and PUSH_PRIVATE_KEY go together: set both to send reminders, or neither",
        path: [value.PUSH_PUBLIC_KEY ? "PUSH_PRIVATE_KEY" : "PUSH_PUBLIC_KEY"],
      });
    }
    if (value.POLAR_WEBHOOK_SECRET && !value.POLAR_CLIENT_ID) {
      ctx.addIssue({
        code: "custom",
        message:
          "POLAR_WEBHOOK_SECRET does nothing without POLAR_CLIENT_ID and POLAR_CLIENT_SECRET",
        path: ["POLAR_WEBHOOK_SECRET"],
      });
    }
  });

/**
 * An empty string means "not set".
 *
 * docker-compose.yml forwards every optional variable as `${VAR:-}`,
 * which hands the container an empty string when the operator left it
 * blank. Without this, `SIGNUP=""` would fail an enum that has a perfectly
 * good default, and the installation would refuse to start over a setting
 * nobody chose. Nothing in this schema gives an empty string a meaning of
 * its own, so dropping the key is the same as never sending it.
 */
function present(source: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === "string" && value !== ""),
  ) as Record<string, string>;
}

export const env = EnvSchema.parse(present(process.env));
