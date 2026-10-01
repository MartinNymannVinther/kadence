import * as THREE from "three";
import {
  courseAt,
  crowdHeard,
  hash,
  inside,
  lapAlong,
  raceDayOf,
  type City,
  type Course,
  type Land,
  type RaceDay,
  type Side,
} from "@/modules/rulle";
import { CityFace } from "./city-face";
import { cobblesMesh, disposeCobbles } from "./cobbles";
import { Crowd } from "./crowd";
import type { Ground } from "./ground";
import { PALETTE as P } from "./palette";
import { freeze } from "./props";
import { marshal, soigneurShape, type Marshal } from "./race-folk";
import { binShape, bumpShape, busShape, ISLAND, islandShape, podiumShape } from "./race-props";
import { RaceRoad } from "./race-road";
import { groundPoint, roadPoint, roadYaw } from "./road-point";
import { merged, rod, v } from "./shapes";
import type { SceneWords, SmallThingsHooks } from "./small-things";
import { disposeTextured, signTexture } from "./text-plates";

/**
 * Race day on a city's closed course (ADR 0036), as `raceDayOf` lays it
 * out: the crowd and its barriers (`crowd.ts`); an island at every
 * obstacle, a marshal on it waving a yellow flag as a rider comes, and a
 * whistle; a marshal at every sharp bend; the cobbles, that shake the
 * picture; the speed bumps, that lift the bike; the feed zone's soigneurs
 * with their musettes held out and the litter zone's bins, each zone with
 * its sign; the team buses where the teams park; the podium. And the
 * city's own face round it all (`city-face.ts`).
 */

/** The islands stand this far left of the road's middle: the riders pass them on the right. */
const ISLAND_AT = -1.9;
/** A marshal waves from this far before the rider reaches them, and whistles once within `WHISTLE`. */
const WAVE = 80;
const WHISTLE = 45;
/** Islands closer together than this are warned of with one whistle. */
const ONE_WHISTLE = 250;
/** Marshals are drawn this far ahead of the rider, and this far behind. */
const SEEN_AHEAD = 450;
const SEEN_BEHIND = 40;

/** Race day on a city's course, laid out from its marks and its land; none anywhere else. */
export function raceDayIn(
  city: City | null,
  course: Course,
  ground: Ground,
  material: THREE.Material,
  words: SceneWords,
  hooks: SmallThingsHooks,
  room: (x: number, z: number, r: number) => void,
  options: { calm: boolean; light: boolean; land?: Land | null },
): RaceDayScene | null {
  if (!city) return null;
  const day = raceDayOf(course, options.land?.setts ?? []);
  return new RaceDayScene(course, ground, day, city, material, words, hooks, room, options);
}

export class RaceDayScene {
  readonly group = new THREE.Group();
  private readonly crowd: Crowd;
  private readonly face: CityFace;
  private readonly marshals: { figure: Marshal; along: number; island: boolean }[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly faces: THREE.Mesh[] = [];
  private readonly cobbles: THREE.Mesh | null;
  private lastAlong: number | null = null;
  private lastWhistle: number | null = null;
  /** How the road feels: the cobbles, the bumps. */
  readonly road: RaceRoad;

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly day: RaceDay,
    city: City,
    private readonly material: THREE.Material,
    words: SceneWords,
    private readonly hooks: SmallThingsHooks,
    /** Makes room on the land for a bus or the podium: no tree or building stands there. */
    room: (x: number, z: number, r: number) => void,
    options: { calm: boolean; light: boolean },
  ) {
    this.road = new RaceRoad(course, day);
    this.crowd = new Crowd(course, ground, day, city, material, options);
    this.face = new CityFace(course, ground, city, material);
    this.group.add(this.crowd.group, this.face.group);
    const fixed = new THREE.Group();
    // What lies on the road, each copy baked where it lies, all of a kind one mesh.
    const onRoad = (shape: THREE.BufferGeometry, places: number[], offset: number) => {
      if (places.length === 0) return;
      const copies = places.map((along) => {
        const p = roadPoint(course, along, offset);
        const turn = new THREE.Euler(
          Math.atan(courseAt(course, along).grade),
          roadYaw(course, along),
          0,
          "YXZ",
        );
        return shape
          .clone()
          .applyMatrix4(
            new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(turn), ONE),
          );
      });
      fixed.add(new THREE.Mesh(this.keep(merged(copies)), material));
      shape.dispose();
    };

    // The islands, each with its marshal at the end the riders come to.
    onRoad(islandShape(), day.islands, ISLAND_AT);
    for (const along of day.islands)
      this.marshal(along + ISLAND.length / 2 - 0.4, ISLAND_AT + 0.25, true);
    // A marshal at each sharp bend, on the outside, a little before it.
    for (const bend of day.bends) this.marshal(bend.along - 12, bend.outside * 3.9, false);
    onRoad(bumpShape(), day.bumps, 0);

    const place = (object: THREE.Object3D, along: number, offset: number, turn = 0) => {
      object.position.copy(groundPoint(course, ground, along, offset));
      object.rotation.y = roadYaw(course, along) + turn;
      fixed.add(object);
      return object;
    };
    // The feed zone: soigneurs in their teams' jackets, a musette held out to the riders.
    if (day.feed) {
      const { from, to, side } = day.feed;
      const parts: THREE.BufferGeometry[] = [];
      let k = 0;
      for (let d = from + 8; d < to; d += 9 + hash(k, 1, 821) * 5, k++) {
        const foot = groundPoint(course, ground, d, side * 3.55);
        const yaw = roadYaw(course, d) + (side * Math.PI) / 2 + side * 0.4;
        const team = P.teams[Math.floor(hash(k, 2, 821) * P.teams.length)]!;
        parts.push(soigneurShape(team).rotateY(yaw).translate(foot.x, foot.y, foot.z));
      }
      fixed.add(new THREE.Mesh(this.keep(merged(parts)), material));
      this.sign(place, words.feed, from - 6, side);
    }
    // The litter zone: its sign, and bins along it.
    if (day.litter) {
      const { from, to, side } = day.litter;
      const bin = this.keep(binShape());
      for (let d = from + 20; d < to; d += 45)
        place(new THREE.Mesh(bin, material), d, side * 3.5, (side * Math.PI) / 2);
      this.sign(place, words.litter, from - 6, side);
    }
    // The team buses, parked in a row along the road where the organiser says.
    if (day.parking) {
      const { along, side, off } = day.parking;
      for (let k = 0; k < 4; k++) {
        const shape = this.keep(busShape(P.teams[k]!));
        const bus = place(
          new THREE.Mesh(shape, material),
          along + (k - 1.5) * 15,
          side * Math.max(11, off),
        );
        room(bus.position.x, bus.position.z, 9);
      }
    }
    // The podium, facing the road.
    if (day.podium) {
      const { along, side, off } = day.podium;
      const podium = place(
        new THREE.Mesh(this.keep(podiumShape()), material),
        along,
        side * Math.max(10, off),
        (side * Math.PI) / 2,
      );
      room(podium.position.x, podium.position.z, 6);
    }

    this.cobbles = cobblesMesh(course, day.cobbles);
    if (this.cobbles) fixed.add(this.cobbles);
    this.group.add(freeze(fixed));
  }

  /** One frame: the crowd near the rider drawn, the marshals ahead waving, the cobbles and the whistles. */
  frame(distance: number, seconds: number): void {
    const L = this.course.length;
    const along = lapAlong(distance, L);
    this.crowd.frame(along, seconds);
    this.face.frame(along);
    const last = this.lastAlong;
    for (const m of this.marshals) {
      const ahead = lapAlong(m.along - along, L);
      m.figure.group.visible = ahead < SEEN_AHEAD || ahead > L - SEEN_BEHIND;
      const waving = ahead < WAVE;
      if (waving || m.figure.waving) {
        m.figure.waving = waving;
        m.figure.animate(seconds, 0);
      }
      if (!m.island || last === null || ahead >= WHISTLE) continue;
      const was = lapAlong(m.along - last, L);
      const since = this.lastWhistle === null ? Infinity : lapAlong(along - this.lastWhistle, L);
      if (was >= WHISTLE && since > ONE_WHISTLE) {
        this.lastWhistle = along;
        this.hooks.sound("whistle");
      }
    }
    if (last !== null && along !== last)
      for (const s of this.day.cobbles)
        if (inside(s, along, L) && !inside(s, last, L)) this.hooks.seen("cobbles", 1);
    this.lastAlong = along;
  }

  /** Makes way in the crowd round a place: for a café, in a pause. */
  clearAround(x: number, z: number, r: number): void {
    this.crowd.clearAround(x, z, r);
  }

  /** How many stand by the road round `distance`, 0 to 1, for the sound under the ride (ADR 0045). */
  heard(distance: number): number {
    return crowdHeard(this.day, this.course, distance);
  }

  dispose(): void {
    this.crowd.dispose();
    this.face.dispose();
    for (const shape of this.shapes) shape.dispose();
    for (const face of this.faces) disposeTextured(face);
    for (const m of this.marshals) m.figure.dispose();
    if (this.cobbles) disposeCobbles(this.cobbles);
  }

  private keep(shape: THREE.BufferGeometry): THREE.BufferGeometry {
    this.shapes.push(shape);
    return shape;
  }

  /** A marshal `offset` right of the road's middle, facing the riders: on an island, or at the kerb. */
  private marshal(along: number, offset: number, island: boolean): void {
    const figure = marshal(this.material);
    const foot = island
      ? roadPoint(this.course, along, offset)
      : groundPoint(this.course, this.ground, along, offset);
    if (island) foot.y += ISLAND.height;
    figure.group.position.copy(foot);
    figure.group.rotation.y = roadYaw(this.course, along) + Math.PI;
    this.marshals.push({ figure, along: lapAlong(along, this.course.length), island });
    this.group.add(figure.group);
  }

  /** A zone's sign on its stand, beside the road `along`, facing the riders. */
  private sign(
    place: (object: THREE.Object3D, along: number, offset: number) => THREE.Object3D,
    text: string,
    along: number,
    side: Side,
  ): void {
    const stand = new THREE.Group();
    const legs = this.keep(
      merged([
        rod(v(-0.75, 0, 0), v(-0.75, 1.9, 0), 0.03, P.metal, 4),
        rod(v(0.75, 0, 0), v(0.75, 1.9, 0), 0.03, P.metal, 4),
      ]),
    );
    stand.add(new THREE.Mesh(legs, this.material));
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.45),
      new THREE.MeshLambertMaterial({ map: signTexture(text) }),
    );
    face.position.set(0, 1.62, 0.04);
    this.faces.push(face);
    stand.add(face);
    place(stand, along, side * 4.4);
  }
}

const ONE = new THREE.Vector3(1, 1, 1);
