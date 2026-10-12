import { z } from "zod";
import { MISTRAL_EU_BASE_URL } from "@/core/llm/mistral";
import { envRules } from "./env-rules";

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

/**
 * The variables' shapes. What they must say together, and what an
 * installation in production may not leave at a placeholder, is checked
 * in env-rules.ts.
 */
export const EnvShape = z.object({
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
  // the first user exists, "open" lets anyone register, and
  // "individuals" lets a person create their own workspace with an
  // address they confirm, while clubs still apply (docs/adr/0088). See
  // src/core/auth/signup.ts.
  SIGNUP: z.enum(["closed", "open", "individuals"]).default("closed"),
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
  AI_MONTHLY_BUDGET_MICRO: z.coerce.number().int().min(0).max(1_000_000_000_000).default(5_000_000),
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
  // Mail through an EU provider (docs/adr/0086), all five or none; without
  // them nothing is sent and links are shared by hand, as before. MAIL_FROM
  // is on the provider's verified domain. Secret: SMTP_PASSWORD (Coolify).
  SMTP_HOST: z.string().min(1).max(255).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().min(1).max(255).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(3).max(320).optional(),
  // Who runs the background jobs (docs/adr/0085): reminders, rides from
  // Wahoo, Garmin and Polar, races from Cykling Danmark, the teams page
  // and the demos' clean-up. "on" means a worker container runs them
  // (the `worker` service in docker-compose.yml) and the app only puts
  // them in the queue. Unset, the app runs them itself, as it ran the
  // reminder timer before: one container is still a whole installation.
  WORKER: z.enum(["off", "on"]).default("off"),
  // Where riders' ride files live (docs/adr/0087): "db" keeps each file
  // in its row in Postgres, as always; "s3" keeps it as an object in an
  // S3-compatible store in the EU (Hetzner Object Storage on
  // kadence.haij.dk) and the row keeps only its key. The row decides
  // who may read either way. With "s3" all five S3_FILES_* are
  // required; they are separate from S3_BACKUP_*, which pgBackRest
  // reads (docs/adr/0089), so the files and the backups never share a
  // bucket or a key. Secrets: the access and secret key live in Coolify.
  FILES_STORAGE: z.enum(["db", "s3"]).default("db"),
  S3_FILES_ENDPOINT: z.url().optional(),
  S3_FILES_REGION: z.string().min(1).max(64).optional(),
  S3_FILES_BUCKET: z.string().min(3).max(63).optional(),
  S3_FILES_ACCESS_KEY: z.string().min(1).optional(),
  S3_FILES_SECRET_KEY: z.string().min(1).optional(),
  // How much file a workspace may hold, in bytes, unless the
  // installation's owner gave it another quota under Indstillinger ->
  // Installation (team_settings.file_quota_bytes): 20 GB for a club,
  // 2 GB for one person (Martin's choice, 11 October 2026), decimal
  // gigabytes as the pages show them. An upload that would pass it is
  // refused with a plain sentence and everything else works. 0 is no
  // quota.
  FILES_QUOTA_CLUB_BYTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000_000_000_000)
    .default(20_000_000_000),
  FILES_QUOTA_PERSONAL_BYTES: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000_000_000_000)
    .default(2_000_000_000),
  // What a workspace pays (docs/adr/0090). "off" (the default) is the
  // self-hoster's and the pilot's setting: every workspace is free, and
  // nothing about prices, trials or payments shows anywhere. "on" gives a
  // new person's workspace a trial of TRIAL_DAYS days, a club the owner
  // admits its first season free, sends the reminders by mail (so it
  // needs mail) and makes a workspace past its trial or its payment read
  // and export only, until the installation's owner registers a payment
  // under Indstillinger -> Installation -> Betaling.
  BILLING: z.enum(["off", "on"]).default("off"),
  // How long a new workspace tries Kadence before it is paid for, in days.
  // 0 is no trial: free until the installation's owner decides otherwise.
  TRIAL_DAYS: z.coerce.number().int().min(0).max(3650).default(30),
});

/**
 * Server-side environment variables, validated at the boundary.
 * Import this instead of reading process.env directly.
 */
export const EnvSchema = EnvShape.superRefine(envRules);

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
