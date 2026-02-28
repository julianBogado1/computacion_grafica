import * as THREE from 'three';
import { createAirport } from './airport';
import { ElevationGeometry } from '../utils/elevationGeometry';

export const AIRPORT_HEIGHT     = 80;
export const AIRPORT_POSITION   = new THREE.Vector3(-100, AIRPORT_HEIGHT, 350);
export const AIRPORT_ROTATION_Y = -0.25 * Math.PI;

export async function createIsland(): Promise<THREE.Group> {
  // Heightmap for terrain displacement
  const displacementMap = await new Promise<THREE.Texture>((resolve) => {
    new THREE.TextureLoader().load('textures/island/heightmap.jpg', resolve);
  });
  displacementMap.wrapS = THREE.RepeatWrapping;
  displacementMap.wrapT = THREE.RepeatWrapping;

  const amplitude = 200;
  const geom = ElevationGeometry(1000, 1000, amplitude, 100, 100, displacementMap);
  if (!geom) return new THREE.Group();

  // Vertex coloring based on height
  const positions = geom.attributes.position as THREE.BufferAttribute;
  const colors    = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = Math.max(0, Math.min(1, y / amplitude));
    const c = terrainColor(t);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const clipHeight = 8; // hide everything below this Y — raise to hide more of the base
  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -clipHeight)],
    clipShadows: true,
  });

  const mesh = new THREE.Mesh(geom, material);
  // mesh.rotation.y = Math.PI / 3;

  const airport = createAirport();
  airport.position.copy(AIRPORT_POSITION);
  airport.rotation.y = AIRPORT_ROTATION_Y;

  const islandGroup = new THREE.Group();
  islandGroup.add(mesh, airport);

  islandGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow    = true;
      obj.receiveShadow = true;
    }
  });

  return islandGroup;
}

function terrainColor(t: number): THREE.Color {
  const sand       = new THREE.Color(0xc2b280);
  const lightGrass = new THREE.Color(0x6abf4b);
  const midGrass   = new THREE.Color(0x3ea832);
  const darkGrass  = new THREE.Color(0x2d7a25);
  const snow       = new THREE.Color(0xffffff);

  const grassHeight  = 0.2;
  const forestHeight = 0.35;
  const snowHeight   = 0.6;

  if (t < grassHeight) {
    return new THREE.Color(sand).lerp(lightGrass, t / grassHeight);
  } else if (t < forestHeight) {
    return new THREE.Color(lightGrass).lerp(midGrass, (t - grassHeight) / (forestHeight - grassHeight));
  } else if (t < snowHeight) {
    return new THREE.Color(midGrass).lerp(darkGrass, (t - forestHeight) / (snowHeight - forestHeight));
  } else {
    return new THREE.Color(darkGrass).lerp(snow, (t - snowHeight) / (1 - snowHeight));
  }
}
