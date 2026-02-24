import * as THREE from 'three';

export type TowerProps = {
  towerHeight: number;
  towerBaseSize: number;
  towerTopSize: number;
  pyramidHeight: number;
};

export function createTower({ towerHeight, towerBaseSize, towerTopSize, pyramidHeight }: TowerProps): THREE.Group {
  const towerGeom = new THREE.BoxGeometry(towerBaseSize, towerHeight, towerBaseSize);
  const towerMat  = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const tower     = new THREE.Mesh(towerGeom, towerMat);

  const towerTopGeom = createTruncatedPyramid(towerBaseSize, towerTopSize, pyramidHeight);
  const towerTopMat  = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const towerTop     = new THREE.Mesh(towerTopGeom, towerTopMat);
  towerTop.position.y = towerHeight / 2;

  const towerGroup = new THREE.Group();
  towerGroup.add(tower, towerTop);
  return towerGroup;
}

function createTruncatedPyramid(baseSize = 2, topSize = 1, height = 2): THREE.BufferGeometry {
  const halfBase = baseSize / 2;
  const halfTop  = topSize / 2;

  // 8 vertices: base (y = 0) and top (y = height)
  const vertices = [
    // base square
    new THREE.Vector3(-halfBase, 0,      -halfBase), // 0
    new THREE.Vector3( halfBase, 0,      -halfBase), // 1
    new THREE.Vector3( halfBase, 0,       halfBase), // 2
    new THREE.Vector3(-halfBase, 0,       halfBase), // 3
    // top square
    new THREE.Vector3(-halfTop,  height, -halfTop),  // 4
    new THREE.Vector3( halfTop,  height, -halfTop),  // 5
    new THREE.Vector3( halfTop,  height,  halfTop),  // 6
    new THREE.Vector3(-halfTop,  height,  halfTop),  // 7
  ];

  // Faces (triangles)
  const indices = [
    // bottom
    0, 1, 2,  0, 2, 3,
    // top
    4, 6, 5,  4, 7, 6,
    // sides
    0, 4, 5,  0, 5, 1,  // front
    1, 5, 6,  1, 6, 2,  // right
    2, 6, 7,  2, 7, 3,  // back
    3, 7, 4,  3, 4, 0,  // left
  ];

  const geom = new THREE.BufferGeometry().setFromPoints(vertices);
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}
