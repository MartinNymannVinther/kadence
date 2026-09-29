import * as THREE from "three";
import { hash } from "./noise";
import { PALETTE } from "./palette";
import { cloud } from "./props";

/**
 * Light and air: a low autumn sun from the south-west and the sky's cool
 * light from above; a dome of sky that pales into haze at the horizon,
 * and the same haze as fog, so the land fades into it rather than ending;
 * still water where the land dips below the sea; a few slow clouds.
 */
export class Atmosphere {
  readonly group = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly water: THREE.Mesh;
  private readonly clouds: THREE.Mesh[] = [];
  private readonly disposables: { dispose: () => void }[] = [];
  private placed = false;

  constructor(scene: THREE.Scene) {
    const haze = new THREE.Color(PALETTE.haze);
    scene.background = haze;
    scene.fog = new THREE.Fog(haze, 320, 2250);

    const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 2.1);
    const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
    sun.position.set(-0.55, 0.62, 0.56);
    this.group.add(hemi, sun);

    const domeGeometry = new THREE.SphereGeometry(2800, 24, 12);
    const top = new THREE.Color(PALETTE.skyTop);
    const colors: number[] = [];
    const positions = domeGeometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const up = Math.max(0, positions.getY(i) / 2800);
      const c = haze.clone().lerp(top, Math.min(1, Math.pow(up, 0.55) * 1.1));
      colors.push(c.r, c.g, c.b);
    }
    domeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const domeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(domeGeometry, domeMaterial);
    this.dome.renderOrder = -1;
    this.group.add(this.dome);

    const waterGeometry = new THREE.PlaneGeometry(7000, 7000);
    waterGeometry.rotateX(-Math.PI / 2);
    const waterMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.water });
    this.water = new THREE.Mesh(waterGeometry, waterMaterial);
    this.water.position.y = -0.1;
    this.group.add(this.water);

    const cloudMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      emissive: new THREE.Color(PALETTE.cloud).multiplyScalar(0.35),
    });
    for (let k = 0; k < 9; k++) {
      const mesh = new THREE.Mesh(cloud(k + 1), cloudMaterial);
      const angle = hash(k, 0, 7) * Math.PI * 2;
      const distance = 700 + hash(k, 1, 7) * 900;
      mesh.position.set(
        Math.cos(angle) * distance,
        260 + hash(k, 2, 7) * 140,
        Math.sin(angle) * distance,
      );
      mesh.rotation.y = hash(k, 3, 7) * Math.PI;
      this.clouds.push(mesh);
      this.group.add(mesh);
      this.disposables.push(mesh.geometry);
    }
    this.disposables.push(domeGeometry, domeMaterial, waterGeometry, waterMaterial, cloudMaterial);
    scene.add(this.group);
  }

  /** The sky and the sea keep their distance; the clouds drift east on the westerly. */
  follow(camera: THREE.Vector3, seconds: number): void {
    if (!this.placed) {
      // The clouds were laid out around nowhere in particular; now around the rider.
      for (const c of this.clouds) c.position.add(new THREE.Vector3(camera.x, 0, camera.z));
      this.placed = true;
    }
    this.dome.position.set(camera.x, 0, camera.z);
    this.water.position.x = camera.x;
    this.water.position.z = camera.z;
    for (const c of this.clouds) {
      c.position.x += seconds * 2.5;
      const dx = c.position.x - camera.x;
      const dz = c.position.z - camera.z;
      // A cloud that drifted too far comes round again on the other side.
      if (Math.hypot(dx, dz) > 1800) {
        c.position.x = camera.x - dx * 0.9;
        c.position.z = camera.z - dz * 0.9;
      }
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
