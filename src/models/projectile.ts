import * as THREE from 'three';

export type { Projectile };

interface Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spawnTime: number;
  mass: number; 
  radius?: number; // for collision detection, optional since we can use mesh geometry
}


const GRAVITY = 9.81;
const shotCooldown = 0.25;
const projectileSpeed = 200;
const projectileMass = 10;

let lastShotTime = 0;


export function fireProjectile(projectiles: Projectile[], cannon: THREE.Object3D): THREE.Mesh {

  const now = performance.now() / 1000;
  if (now - lastShotTime < shotCooldown) return;
  lastShotTime = now;

  const pos = new THREE.Vector3();
  cannon.getWorldPosition(pos);

  const dir = new THREE.Vector3(1, 0, 0); // local +X = barrel direction
  dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); // correct for model orientation

  const quaternion = new THREE.Quaternion();
  cannon.getWorldQuaternion(quaternion);
  dir.applyQuaternion(quaternion);

  const geom = new THREE.SphereGeometry(1.8, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0x663300 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(pos);

  const vel = dir.clone().multiplyScalar(projectileSpeed);
  projectiles.push({ mesh, vel, spawnTime: now, mass: projectileMass });

  return mesh;
}

// Call this every frame for each projectile instead of updating vel/pos manually
export function updateProjectile(p: Projectile, dt: number): void {
  p.vel.y -= GRAVITY * p.mass * dt;
  p.mesh.position.addScaledVector(p.vel, dt);
}

/**
 * Create a spherical hitbox for every target and check if the projectile's position is inside any of them. If so, call `onHit()`.
 */
export function checkForCollisions(
  projectile: Projectile, 
  targets: THREE.Object3D[], 
  onHit: () => void): void {

  const pPos = projectile.mesh.position;
  for (const target of targets) {
    const targetBox = new THREE.Box3().setFromObject(target);
    if (targetBox.containsPoint(pPos)) {
      onHit();
    }
  }
}
