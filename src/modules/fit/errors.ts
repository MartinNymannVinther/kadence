/**
 * Why Kadence refused a FIT file. The decoder reads untrusted uploads, so
 * every way a file can be wrong has a name, and the upload says which
 * rather than storing a ride built from a guess (CLAUDE.md, security rules).
 *
 * - `not_fit`: no ".FIT" signature where the protocol puts one.
 * - `truncated`: the file, or a message in it, ends before its header says.
 * - `bad_crc`: the checksum does not match and the caller asked to be
 *   strict. By default a bad checksum is only reported (`crcOk: false`):
 *   plenty of real files carry one and are otherwise whole.
 * - `too_large`: more bytes, records, definitions or hours than Kadence reads.
 * - `unsupported`: a FIT file, but a header size or protocol version this
 *   decoder does not know.
 * - `corrupt`: every byte is there, but the messages break the protocol —
 *   data before its definition, an unknown byte order, no file_id.
 * - `empty`: decoded, but without a single timestamped record to summarize.
 * - `unknown_format`: neither FIT, TCX, GPX nor an archive holding one
 *   (src/modules/files).
 * - `no_activity`: an archive with no activity file in it.
 */
export type FitErrorCode =
  | "not_fit"
  | "truncated"
  | "bad_crc"
  | "too_large"
  | "unsupported"
  | "corrupt"
  | "empty"
  | "unknown_format"
  | "no_activity";

export class FitError extends Error {
  readonly code: FitErrorCode;

  constructor(code: FitErrorCode, message: string) {
    super(message);
    this.name = "FitError";
    this.code = code;
  }
}
