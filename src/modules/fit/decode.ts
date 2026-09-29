import { fitCrc } from "./crc";
import { FitError } from "./errors";
import { readHeader } from "./header";
import {
  toActivity,
  toEvent,
  toFileId,
  toLap,
  toRecord,
  toSession,
  toSport,
  toWorkout,
  toWorkoutStep,
  type FileIdInfo,
} from "./messages";
import { MESG } from "./profile";
import { readMessages, type DataMessage } from "./stream";
import type { FitFile } from "./types";

/**
 * Kadence's own FIT decoder (CLAUDE.md: no dependency, by decision). It
 * reads what a ride or a workout needs — file_id, record, lap, session,
 * event, activity, sport, workout and workout_step — from either byte
 * order, with compressed timestamps and developer fields, and skips every
 * other message by its definition's size.
 *
 * The bytes are an upload and are treated as hostile: the file's size, its
 * records, laps, sessions, events, workout steps, definitions and messages
 * are all capped, and every read is checked against the end of the data.
 * A file that is not FIT, is cut short, or breaks the protocol is refused
 * with a `FitError` naming why. A checksum that does not match is only
 * reported (`crcOk: false`) unless the caller asks for `strictCrc`: many
 * real files carry one and are otherwise whole, and the upload can say so.
 *
 * When one file holds several FIT files one after the other (a chained
 * file), the first is read and the rest ignored.
 */

export const FIT_LIMITS = {
  /** 25 MB. A ten-hour ride at one record a second is under 5 MB. */
  maxBytes: 25 * 1024 * 1024,
  /** About 55 hours at one record a second. */
  maxRecords: 200_000,
  maxLaps: 10_000,
  maxSessions: 100,
  maxEvents: 50_000,
  maxWorkoutSteps: 1_000,
  maxDefinitions: 50_000,
  maxMessages: 2_000_000,
} as const;

export interface DecodeOptions {
  /** Refuse a file whose checksum does not match (`bad_crc`) instead of flagging it. */
  strictCrc?: boolean;
}

const WANTED: ReadonlySet<number> = new Set([
  MESG.fileId,
  MESG.sport,
  MESG.session,
  MESG.lap,
  MESG.record,
  MESG.event,
  MESG.workout,
  MESG.workoutStep,
  MESG.activity,
]);

export function decodeFit(bytes: Uint8Array, options: DecodeOptions = {}): FitFile {
  if (bytes.byteLength > FIT_LIMITS.maxBytes)
    throw new FitError("too_large", `Larger than ${FIT_LIMITS.maxBytes} bytes.`);

  const header = readHeader(bytes);
  const end = header.headerSize + header.dataSize;
  if (end + 2 > bytes.byteLength)
    throw new FitError("truncated", "The file ends before its header says it does.");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const crcOk = header.headerCrcOk && fitCrc(bytes, 0, end) === view.getUint16(end, true);
  if (!crcOk && options.strictCrc)
    throw new FitError("bad_crc", "The file's checksum does not match.");

  const file: Omit<FitFile, "fileType"> = {
    crcOk,
    protocolVersion: header.protocolVersion,
    profileVersion: header.profileVersion,
    records: [],
    laps: [],
    sessions: [],
    events: [],
    workoutSteps: [],
  };
  let fileId: FileIdInfo | undefined;
  let sportMessage: ReturnType<typeof toSport> | undefined;

  const collect = (message: DataMessage) => {
    const { fields, timestamp } = message;
    switch (message.global) {
      case MESG.fileId:
        fileId ??= toFileId(fields);
        return;
      case MESG.record: {
        const record = toRecord(fields, timestamp);
        if (record) push(file.records, record, FIT_LIMITS.maxRecords, "records");
        return;
      }
      case MESG.lap:
        push(file.laps, toLap(fields), FIT_LIMITS.maxLaps, "laps");
        return;
      case MESG.session:
        push(file.sessions, toSession(fields), FIT_LIMITS.maxSessions, "sessions");
        return;
      case MESG.event:
        push(file.events, toEvent(fields, timestamp), FIT_LIMITS.maxEvents, "events");
        return;
      case MESG.activity:
        file.activity ??= toActivity(fields);
        return;
      case MESG.sport:
        sportMessage ??= toSport(fields);
        return;
      case MESG.workout:
        file.workout ??= toWorkout(fields);
        return;
      case MESG.workoutStep:
        push(file.workoutSteps, toWorkoutStep(fields), FIT_LIMITS.maxWorkoutSteps, "steps");
        return;
    }
  };

  readMessages(bytes, header.headerSize, end, WANTED, FIT_LIMITS, collect);

  // Every FIT file opens with a file_id saying what it holds; one without
  // is not a file Kadence can put a name to.
  if (fileId?.fileType === undefined)
    throw new FitError("corrupt", "No file_id message saying what the file holds.");

  const session = file.sessions.find((s) => s.sport !== undefined);
  return {
    ...file,
    fileType: fileId.fileType,
    manufacturer: fileId.manufacturer,
    product: fileId.product,
    serialNumber: fileId.serialNumber,
    timeCreated: fileId.timeCreated,
    sport: session?.sport ?? sportMessage?.sport,
    subSport: session ? session.subSport : sportMessage?.subSport,
  };
}

function push<T>(list: T[], item: T, max: number, what: string): void {
  if (list.length >= max) throw new FitError("too_large", `More than ${max} ${what}.`);
  list.push(item);
}
