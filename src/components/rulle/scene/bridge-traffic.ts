import * as THREE from "three";
import { hash } from "@/modules/rulle";
import { BOGIES, CARRIAGE, carriage, lorry, motorwayCar } from "./bridge-vehicles";
import type { DeckLine } from "./overpass-deck";
import { frameAtArc } from "./overpass-line";
import { railsAcross } from "./overpasses";
import { PALETTE as P } from "./palette";
import { treeMaterial } from "./trees";

/**
 * What runs over the bridges over the road (ADR 0037): now and then a
 * train over a railway's, three carriages long, one way and then the
 * other; and over a motorway's, cars and lorries both ways, keeping
 * right. It runs only while
 * the rider is near enough to see it, and none of it stops or is counted.
 */

/** Metres from a bridge within which what runs on it runs: about as far as the haze lets one see. */
const RANGE = 1800;
/** A train: its carriages, how far apart their middles are, m/s, and seconds between trains. */
const TRAIN = {
  carriages: 3,
  coupled: CARRIAGE + 0.8,
  speed: 22,
  first: [4, 30],
  between: [60, 130],
} as const;
/**
 * A motorway's lanes each way, from the middle out: metres right of the
 * middle, how fast each goes, m/s, and how many of those in it are
 * lorries — they keep right. A wide one has three each way.
 */
const LANES = [
  { off: 4.2, speed: 34, lorries: 0 },
  { off: 7.9, speed: 29, lorries: 0.1 },
  { off: 11.6, speed: 24, lorries: 0.4 },
];
const THREE_LANES = 30;
/** Metres between vehicles in a lane, on average, and at most this many in one. */
const APART = 70;
const PER_LANE = 20;
/** Where nothing is to be seen: an instance scaled to nothing. */
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

type Box = { x0: number; x1: number; z0: number; z1: number };

type Train = {
  deck: DeckLine;
  box: Box;
  cars: THREE.Mesh[];
  /** The track it runs on going along the line and coming back, metres right of its middle. */
  track: { along: number; back: number };
  way: 1 | -1;
  /** Where its front is, metres along the line; null while none runs. */
  head: number | null;
  wait: number;
  near: boolean;
  runs: number;
  seed: number;
};

type Vehicle = {
  way: 1 | -1;
  lane: number;
  phase: number;
  mesh: THREE.InstancedMesh;
  slot: number;
};

type Flow = {
  deck: DeckLine;
  box: Box;
  meshes: THREE.InstancedMesh[];
  vehicles: Vehicle[];
  loop: number;
};

export class BridgeTraffic {
  readonly group = new THREE.Group();
  private readonly trains: Train[] = [];
  private readonly flows: Flow[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly painted = treeMaterial();
  private readonly dummy = new THREE.Object3D();
  private clock = 0;

  constructor(decks: readonly DeckLine[], material: THREE.Material) {
    this.dummy.rotation.order = "YXZ";
    const front = carriage(true);
    const middle = carriage(false);
    const car = motorwayCar();
    const truck = lorry();
    this.shapes.push(front, middle, car, truck);
    decks.forEach((deck, index) => {
      if (deck.kind === "rail") this.trains.push(this.train(deck, index, material, front, middle));
      if (deck.kind === "motorway") this.flows.push(this.flow(deck, index, car, truck));
    });
  }

  frame(eye: THREE.Vector3, seconds: number): void {
    this.clock += seconds;
    for (const train of this.trains) this.run(train, near(train.box, eye), seconds);
    for (const flow of this.flows) {
      const visible = near(flow.box, eye);
      for (const mesh of flow.meshes) mesh.visible = visible;
      if (visible) this.drive(flow);
    }
  }

  dispose(): void {
    for (const shape of this.shapes) shape.dispose();
    for (const flow of this.flows) for (const mesh of flow.meshes) mesh.dispose();
    this.painted.dispose();
  }

  private train(
    deck: DeckLine,
    index: number,
    material: THREE.Material,
    front: THREE.BufferGeometry,
    middle: THREE.BufferGeometry,
  ): Train {
    const cars = Array.from({ length: TRAIN.carriages }, (_, k) => {
      const mesh = new THREE.Mesh(k === 0 || k === TRAIN.carriages - 1 ? front : middle, material);
      mesh.rotation.order = "YXZ";
      mesh.visible = false;
      this.group.add(mesh);
      return mesh;
    });
    // Each track's middle, right of the line's; a train keeps right, as the cars do.
    const tracks = railsAcross(deck.width)
      .filter((_, k) => k % 2 === 0)
      .map((s) => -(s + 0.72));
    return {
      deck,
      box: boxOf(deck),
      cars,
      track: { along: Math.max(...tracks), back: Math.min(...tracks) },
      way: hash(index, 3, 37) < 0.5 ? 1 : -1,
      head: null,
      wait: Infinity,
      near: false,
      runs: 0,
      seed: index,
    };
  }

  /** A train's run: waiting while the rider is near, then across from one end to the other. */
  private run(t: Train, near: boolean, seconds: number): void {
    if (near && !t.near) t.wait = Math.min(t.wait, between(TRAIN.first, t.runs, t.seed));
    t.near = near;
    if (t.head === null) {
      if (near) t.wait -= seconds;
      if (t.wait > 0) return;
      t.head = t.way === 1 ? 0 : t.deck.length;
    }
    t.head += t.way * TRAIN.speed * seconds;
    const { deck, way, head } = t;
    const off = way === 1 ? t.track.along : t.track.back;
    let on = false;
    t.cars.forEach((mesh, k) => {
      const mid = head - way * (CARRIAGE / 2 + k * TRAIN.coupled);
      mesh.visible = mid - CARRIAGE / 2 >= 0 && mid + CARRIAGE / 2 <= deck.length;
      on ||= way === 1 ? mid - CARRIAGE / 2 < deck.length : mid + CARRIAGE / 2 > 0;
      if (!mesh.visible) return;
      // The last carriage's cab faces back, the way the train will go next.
      const facing = k === TRAIN.carriages - 1 && k > 0 ? -way : way;
      stand(mesh, deck, mid - (facing * BOGIES) / 2, mid + (facing * BOGIES) / 2, off, 0.18);
      // The bridges are placed once and frozen (`freeze`): what moves on them sets its own place.
      mesh.updateMatrix();
    });
    if (on) return;
    // Gone: the next comes the other way, a while later.
    t.head = null;
    t.way = way === 1 ? -1 : 1;
    t.runs += 1;
    t.wait = between(TRAIN.between, t.runs, t.seed);
  }

  private flow(
    deck: DeckLine,
    index: number,
    car: THREE.BufferGeometry,
    truck: THREE.BufferGeometry,
  ): Flow {
    const perLane = Math.max(2, Math.min(PER_LANE, Math.round(deck.length / APART)));
    // A little way unseen past each end before a vehicle comes round again: the gaps vary.
    const loop = deck.length + 60;
    const planned: { way: 1 | -1; lane: number; phase: number; big: boolean }[] = [];
    // Two lanes each way, the middle one left out, or three on a wide one.
    const lanes = deck.width >= THREE_LANES ? [0, 1, 2] : [0, 2];
    for (const way of [1, -1] as const)
      lanes.forEach((j) => {
        const lane = LANES[j]!;
        for (let i = 0; i < perLane; i++) {
          const k = j * 2 + (way === 1 ? 0 : 1);
          const phase = ((i + hash(i, k, index) * 0.7) * loop) / perLane;
          planned.push({ way, lane: j, phase, big: hash(i, k, index + 101) < lane.lorries });
        }
      });
    const make = (shape: THREE.BufferGeometry, count: number): THREE.InstancedMesh | null => {
      if (count === 0) return null;
      const mesh = new THREE.InstancedMesh(shape, this.painted, count);
      mesh.boundingSphere = sphereOf(deck);
      this.group.add(mesh);
      return mesh;
    };
    const lorries = planned.filter((p) => p.big).length;
    const kinds = [make(car, planned.length - lorries), make(truck, lorries)];
    const meshes = kinds.filter((m): m is THREE.InstancedMesh => m !== null);
    const slots = [0, 0];
    const vehicles = planned.map((p, n) => {
      const which = p.big ? 1 : 0;
      const mesh = kinds[which]!;
      const slot = slots[which]!++;
      mesh.setColorAt(
        slot,
        new THREE.Color(COLOURS[Math.floor(hash(n, 5, index) * COLOURS.length)]),
      );
      return { way: p.way, lane: p.lane, phase: p.phase, mesh, slot };
    });
    for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { deck, box: boxOf(deck), meshes, vehicles, loop };
  }

  /** Every vehicle on a motorway's bridge where it has got to by now. */
  private drive(f: Flow): void {
    const { deck, loop } = f;
    for (const v of f.vehicles) {
      const lane = LANES[v.lane]!;
      const gone = (v.phase + lane.speed * this.clock) % loop;
      const s = v.way === 1 ? gone : deck.length - gone;
      if (s < 4 || s > deck.length - 4) v.mesh.setMatrixAt(v.slot, HIDDEN);
      else {
        stand(this.dummy, deck, s - v.way * 2, s + v.way * 2, v.way * lane.off, 0);
        this.dummy.updateMatrix();
        v.mesh.setMatrixAt(v.slot, this.dummy.matrix);
      }
    }
    for (const mesh of f.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** The colours the cars on a motorway come in: the road's cars', and black and silver. */
const COLOURS = [...P.cars, "#3a3d40", "#c3c7cb", "#e8e4dc"];

/**
 * Something that faces -z stood on a deck between two places along it,
 * `back` and `front` metres in, `off` right of the line's middle and
 * `lift` above its top, pointing from the one to the other.
 */
function stand(
  object: THREE.Object3D,
  deck: DeckLine,
  back: number,
  front: number,
  off: number,
  lift: number,
): void {
  const a = onDeck(deck, back, off);
  const b = onDeck(deck, front, off);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  object.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + lift, (a.z + b.z) / 2);
  object.rotation.set(Math.atan2(b.y - a.y, Math.hypot(dx, dz)), Math.atan2(-dx, -dz), 0);
}

/** A place on a deck's top, `s` metres along it and `off` right of its middle. */
function onDeck(deck: DeckLine, s: number, off: number): { x: number; y: number; z: number } {
  const f = frameAtArc(deck.line, deck.arc, s);
  // The line's `s` runs to its left: right is the other way.
  return { x: f.x - f.sx * off, y: deck.top(s), z: f.z - f.sz * off };
}

/** Seconds to wait, from a range, the same for the same bridge and run each ride. */
function between([from, to]: readonly [number, number], runs: number, seed: number): number {
  return from + hash(runs, seed, 59) * (to - from);
}

function boxOf(deck: DeckLine): Box {
  const xs = deck.line.map((p) => p.x);
  const zs = deck.line.map((p) => p.z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

function near(b: Box, eye: THREE.Vector3): boolean {
  const dx = Math.max(b.x0 - eye.x, 0, eye.x - b.x1);
  const dz = Math.max(b.z0 - eye.z, 0, eye.z - b.z1);
  return Math.hypot(dx, dz) < RANGE;
}

/** A sphere round all of a deck, whatever runs on it: what the camera culls by. */
function sphereOf(deck: DeckLine): THREE.Sphere {
  const b = boxOf(deck);
  const y = deck.top(deck.length / 2);
  const centre = new THREE.Vector3((b.x0 + b.x1) / 2, y, (b.z0 + b.z1) / 2);
  return new THREE.Sphere(centre, Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2 + 60);
}
