/**
 * How the worker's handling of one event from a provider ended
 * (webhooks.ts): a job's result, and what the tests read. An outcome is
 * final; anything worth trying again is thrown instead.
 */
export type WebhookOutcome =
  | "imported"
  | "duplicate"
  | "unknown_user"
  | "download_failed"
  /** Garmin will not hand the file over again: downloaded before, or more than a day old. */
  | "gone"
  | "invalid_file"
  | "reconnect"
  | "revoked"
  | "still_connected"
  /** The rider's permissions were read again and stored. */
  | "permissions"
  | "refused";
