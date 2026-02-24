import * as THREE from 'three';

export const SEA_LEVEL = 15;

export function createSea(): THREE.Mesh {
  const seaTexture = new THREE.TextureLoader().load('textures/sea/sea.jpg');
  seaTexture.wrapS = THREE.RepeatWrapping;
  seaTexture.wrapT = THREE.RepeatWrapping;
  seaTexture.repeat.set(20, 20);

  const waterGeom = new THREE.PlaneGeometry(10000, 10000, 100, 100);
  const waterMat = new THREE.MeshStandardMaterial({
    map: seaTexture,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.rotateX(-Math.PI / 2);
  return water;
}
