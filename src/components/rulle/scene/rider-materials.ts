import * as THREE from "three";
import { jerseyTexture } from "./jersey-pattern";
import type { Kit } from "./kits";
import { PALETTE } from "./palette";

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });

/**
 * The figure's materials (`RiderFigure`), in a kit's colours: the jersey,
 * two-toned if the kit says so (`jersey-pattern.ts`), its sleeves, band and stripes, the shorts and their leg ends, skin,
 * helmet, socks, shoes, gloves, lenses, the bottle and the shadow.
 */
export function kitMaterials(kit: Kit) {
  return {
    jersey: kit.lower
      ? new THREE.MeshLambertMaterial({ map: jerseyTexture(kit), flatShading: true })
      : lambert(kit.jersey),
    /** The torso's ends, where no pattern is drawn. */
    jerseyEnds: lambert(kit.jersey),
    light: lambert(kit.sleeve),
    band: lambert(kit.band),
    stripe: lambert(kit.sleeveStripe ?? kit.sleeve),
    hemUpper: lambert(kit.hem?.[0] ?? kit.shorts),
    hemLower: lambert(kit.hem?.[1] ?? kit.shorts),
    shorts: lambert(kit.shorts),
    skin: lambert(kit.skin),
    helmet: lambert(kit.helmet),
    dark: lambert(PALETTE.dark),
    bidon: lambert(PALETTE.bidon),
    shoe: lambert(kit.shoe),
    sock: lambert(kit.sock),
    glove: lambert(kit.glove),
    lens: new THREE.MeshLambertMaterial({
      color: kit.lens,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    shadow: new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  };
}

export type KitMaterials = ReturnType<typeof kitMaterials>;
