import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ShipParts {
  wrapper: THREE.Group;
  turret: THREE.Mesh | null;
  cannon: THREE.Mesh | null;
}

const CANNON_COLOR = 0x101010;

export async function createShip(): Promise<ShipParts> {
  const textureLoader = new THREE.TextureLoader();

  const shipTexture   = textureLoader.load('textures/ship/pirate_map_shadow.jpg');
  const turretTexture = textureLoader.load('textures/ship/turret_texture.jpg');

  // Ensure proper color space for diffuse maps
  shipTexture.colorSpace   = THREE.SRGBColorSpace;
  turretTexture.colorSpace = THREE.SRGBColorSpace;

  // Fix UV alignment
  shipTexture.flipY   = false;
  turretTexture.flipY = false;
  shipTexture.wrapS   = THREE.RepeatWrapping;
  shipTexture.wrapT   = THREE.RepeatWrapping;
  turretTexture.wrapS = THREE.RepeatWrapping;
  turretTexture.wrapT = THREE.RepeatWrapping;

  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      'destructor.glb',
      (gltf: any) => {
        const ship = gltf.scene;
        let turret: THREE.Mesh | null = null;
        let cannon: THREE.Mesh | null = null;

        ship.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            if (child.name === 'destructor') {
              child.material = new THREE.MeshStandardMaterial({ map: shipTexture });
            } else if (child.name === 'torreta') {
              turret = child;
              child.material = new THREE.MeshStandardMaterial({ map: turretTexture });
            } else if (child.name === 'canon') {
              cannon = child;
              child.material = new THREE.MeshStandardMaterial({ color: CANNON_COLOR });
            }
          }
        });

        const center = new THREE.Box3().setFromObject(ship).getCenter(new THREE.Vector3());
        ship.position.set(-center.x, -center.y, -center.z);

        const wrapper = new THREE.Group();
        wrapper.add(ship);
        wrapper.scale.multiplyScalar(0.5);
        wrapper.position.set(0, 2.5, 50);

        resolve({ cannon, turret, wrapper });
      },
      undefined,
      (error: any) => reject(error),
    );
  });
}

export function rotateShip(ship: THREE.Group, omega: number): void {
  ship.rotation.y += omega;
}
