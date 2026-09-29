import { crc32, deflateRawSync } from "node:zlib";

/** Activity files in the XML formats and archives, built in code, as real exporters write them. */

const T0 = Date.UTC(2026, 7, 11, 13, 40, 0);
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();

/** A GPX track as Garmin Connect exports it: a point a second going north, with hr and cad. */
export function gpx(seconds = 600, opts: { type?: string; power?: boolean } = {}): string {
  const points = Array.from(
    { length: seconds },
    (_, s) => `
      <trkpt lat="${(55.87 + s * 0.00009).toFixed(8)}" lon="12.5077">
        <ele>${40 + s * 0.05}</ele>
        <time>${iso(s)}</time>
        <extensions><ns3:TrackPointExtension>
          <ns3:atemp>26.0</ns3:atemp><ns3:hr>140</ns3:hr><ns3:cad>88</ns3:cad>
        </ns3:TrackPointExtension>${opts.power ? `<power>210</power>` : ""}</extensions>
      </trkpt>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" version="1.1" xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <!-- exported -->
  <trk><name>Hørsholm &amp; omegn</name><type>${opts.type ?? "road_biking"}</type><trkseg>${points}
  </trkseg></trk>
</gpx>`;
}

/** A TCX activity of two laps of five minutes, with speed and watts in the TPX extension. */
export function tcx(sport = "Biking"): string {
  const lap = (from: number) => {
    const points = Array.from(
      { length: 300 },
      (_, i) => `
        <Trackpoint>
          <Time>${iso(from + i)}</Time>
          <Position><LatitudeDegrees>55.8</LatitudeDegrees><LongitudeDegrees>${(12.5 + (from + i) * 0.00015).toFixed(6)}</LongitudeDegrees></Position>
          <AltitudeMeters>30</AltitudeMeters>
          <DistanceMeters>${(from + i) * 9}</DistanceMeters>
          <HeartRateBpm><Value>${from === 0 ? 130 : 150}</Value></HeartRateBpm>
          <Cadence>90</Cadence>
          <Extensions><ns3:TPX><ns3:Speed>9</ns3:Speed><ns3:Watts>${from === 0 ? 180 : 240}</ns3:Watts></ns3:TPX></Extensions>
        </Trackpoint>`,
    ).join("");
    return `<Lap StartTime="${iso(from)}"><TotalTimeSeconds>300</TotalTimeSeconds><DistanceMeters>2700</DistanceMeters><Track>${points}</Track></Lap>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <Activities><Activity Sport="${sport}"><Id>${iso(0)}</Id>${lap(0)}${lap(300)}</Activity></Activities>
</TrainingCenterDatabase>`;
}

export const bytesOf = (text: string) => new TextEncoder().encode(text);

/**
 * A zip of the given entries, stored or deflated, as a zip tool writes one.
 * `zip64` writes the sizes and offsets the way an archive past 4 GB must
 * (the 32-bit fields full, the values in the extra field and a zip64 end
 * record); `comment` trails the end record, as a zip may.
 */
export function zip(
  entries: Array<{ name: string; bytes: Uint8Array; deflate?: boolean }>,
  options: { zip64?: boolean; comment?: string } = {},
): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  const FULL = 0xffffffff;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.deflate ? deflateRawSync(entry.bytes) : Buffer.from(entry.bytes);
    const crc = crc32(entry.bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    const extra = Buffer.alloc(options.zip64 ? 28 : 0);
    if (options.zip64) {
      extra.writeUInt16LE(0x0001, 0);
      extra.writeUInt16LE(24, 2);
      extra.writeBigUInt64LE(BigInt(entry.bytes.length), 4);
      extra.writeBigUInt64LE(BigInt(data.length), 12);
      extra.writeBigUInt64LE(BigInt(offset), 20);
    }
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(45, 4);
    central.writeUInt16LE(options.zip64 ? 45 : 20, 6);
    central.writeUInt16LE(entry.deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(options.zip64 ? FULL : data.length, 20);
    central.writeUInt32LE(options.zip64 ? FULL : entry.bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(options.zip64 ? FULL : offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name, extra);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const tail: Buffer[] = [];
  if (options.zip64) {
    const record = Buffer.alloc(56);
    record.writeUInt32LE(0x06064b50, 0);
    record.writeBigUInt64LE(44n, 4);
    record.writeUInt16LE(45, 12);
    record.writeUInt16LE(45, 14);
    record.writeBigUInt64LE(BigInt(entries.length), 24);
    record.writeBigUInt64LE(BigInt(entries.length), 32);
    record.writeBigUInt64LE(BigInt(directory.length), 40);
    record.writeBigUInt64LE(BigInt(offset), 48);
    const locator = Buffer.alloc(20);
    locator.writeUInt32LE(0x07064b50, 0);
    locator.writeBigUInt64LE(BigInt(offset + directory.length), 8);
    locator.writeUInt32LE(1, 16);
    tail.push(record, locator);
  }
  const comment = Buffer.from(options.comment ?? "");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 8);
  end.writeUInt16LE(options.zip64 ? 0xffff : entries.length, 10);
  end.writeUInt32LE(options.zip64 ? FULL : directory.length, 12);
  end.writeUInt32LE(options.zip64 ? FULL : offset, 16);
  end.writeUInt16LE(comment.length, 20);
  return new Uint8Array(Buffer.concat([...locals, directory, ...tail, end, comment]));
}
