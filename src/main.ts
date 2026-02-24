import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createIsland, AIRPORT_HEIGHT, AIRPORT_POSITION, AIRPORT_ROTATION_Y } from './models/island';
import { createSea, SEA_LEVEL } from './models/sea';
import { createShip, rotateShip } from './models/ship';
import { createPlane, rotateBlades, LANDING_GEAR_OFFSET } from './models/plane';
import { AirplaneController } from './utils/airplaneController.js';
import { checkForCollisions, fireProjectile, updateProjectile } from './models/projectile';
import { createExplosion, updateExplosion, loadExplosionGif } from './models/explosion.js';
import type { Projectile } from './models/projectile';
import type { Explosion } from './models/explosion.js';


//===========Constants===========

// Camera offsets — third-person
const PLANE_TP_OFFSET_X = 0;
const PLANE_TP_OFFSET_Y = 20;
const PLANE_TP_OFFSET_Z = 200;

// Camera offsets — first-person (cockpit)
const PLANE_FP_OFFSET_X = 0;
const PLANE_FP_OFFSET_Y = 5;
const PLANE_FP_OFFSET_Z = 400;

// Plane spawn position (derived from airport layout)
const cosA             = Math.cos(AIRPORT_ROTATION_Y);
const sinA             = Math.sin(AIRPORT_ROTATION_Y);
const RUNWAY_LOCAL_X   = -105; // slightly inside the start end of the runway
const STREET_LOCAL_Z   = 25;   // street offset in airport local space
const PLANE_INITIAL_X     = AIRPORT_POSITION.x + RUNWAY_LOCAL_X * cosA + STREET_LOCAL_Z * sinA;
const PLANE_INITIAL_Y     = AIRPORT_HEIGHT + LANDING_GEAR_OFFSET * 0.4;
const PLANE_INITIAL_Z     = AIRPORT_POSITION.z - RUNWAY_LOCAL_X * sinA + STREET_LOCAL_Z * cosA;
const PLANE_INITIAL_ANGLE = -AIRPORT_ROTATION_Y; // face along the runway toward the far end

// Ship spawn position
const INITIAL_SHIP_POSITION = new THREE.Vector3(0, SEA_LEVEL + 8, 650);

// Turret rotation rates and limits
const TURRET_YAW_RATE   = THREE.MathUtils.degToRad(60);  // rad/s
const TURRET_PITCH_RATE = THREE.MathUtils.degToRad(30);  // rad/s
const MIN_TURRET_THETA  = THREE.MathUtils.degToRad(-90);
const MAX_TURRET_THETA  = THREE.MathUtils.degToRad(90);
const MIN_TURRET_PHI    = THREE.MathUtils.degToRad(-90); // max up
const MAX_TURRET_PHI    = THREE.MathUtils.degToRad(0);   // max down

// Projectiles
const PROJECTILE_LIFETIME = 5; // seconds


//===========Renderer===========
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);


//===========Scene===========
const scene = new THREE.Scene();


//===========Cameras===========
const aspectRatio = window.innerWidth / window.innerHeight;

const camera = new THREE.PerspectiveCamera(100, aspectRatio, 0.1, 10000);
camera.name = 'MainCamera';
camera.position.set(0, 300, 300);

const planeTPCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 10000);
planeTPCamera.name = 'PlaneTPCamera';

const planeFPCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 10000);
planeFPCamera.name = 'PlaneFPCamera';

const shipOrbitalCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 10000);
shipOrbitalCamera.name = 'ShipOrbitalCamera';

const shipChaseCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 10000);
shipChaseCamera.name = 'ShipChaseCamera';

const shipCannonCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 10000);
shipCannonCamera.name = 'ShipCannonCamera';

const cameras = [camera, planeTPCamera, planeFPCamera, shipOrbitalCamera, shipChaseCamera, shipCannonCamera];
let activeCameraIndex = 0;


//===========Lights===========
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(500, 800, 300);
sunLight.castShadow = true;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 3000;
sunLight.shadow.camera.left = -700;
sunLight.shadow.camera.right = 700;
sunLight.shadow.camera.top = 700;
sunLight.shadow.camera.bottom = -700;
scene.add(ambientLight, sunLight);


//===========Skybox===========
const skyTexture = new THREE.TextureLoader().load('textures/sky/wide_sky.jpg');
const skybox = new THREE.Mesh(
  new THREE.SphereGeometry(5000, 32, 32),
  new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, color: 0xFFB6C1 })
);
scene.add(skybox);


//===========Controls===========
const controls = new OrbitControls(camera, renderer.domElement);
controls.dampingFactor = 0.25;
controls.update();

const shipOrbitalControls = new OrbitControls(shipOrbitalCamera, renderer.domElement);
shipOrbitalControls.dampingFactor = 0.25;
shipOrbitalControls.enabled = false; // only active when shipOrbitalCamera is selected

shipOrbitalCamera.position.set(
  INITIAL_SHIP_POSITION.x,
  INITIAL_SHIP_POSITION.y + 120,
  INITIAL_SHIP_POSITION.z - 220
);
shipOrbitalControls.target.copy(INITIAL_SHIP_POSITION);


//===========Models===========
await loadExplosionGif();

const island = await createIsland();

const water = createSea();
water.position.y = SEA_LEVEL;

const shipParts = await createShip();
const ship      = shipParts.wrapper;
const shipGroup = new THREE.Group();
ship.position.copy(INITIAL_SHIP_POSITION);
ship.scale.set(2, 2, 2);
shipGroup.add(ship);

const turretObj = shipParts.turret as THREE.Object3D | null;
const cannonObj = shipParts.cannon as THREE.Object3D | null;
const cannonInitialRotationZ = cannonObj ? cannonObj.rotation.z : 0;
turretObj?.add(new THREE.AxesHelper(30));
cannonObj?.add(new THREE.AxesHelper(20));

const plane = createPlane();
plane.scale.set(0.25, 0.25, 0.25);
plane.position.set(PLANE_INITIAL_X, PLANE_INITIAL_Y, PLANE_INITIAL_Z);
plane.rotation.y = PLANE_INITIAL_ANGLE;
plane.add(new THREE.AxesHelper(50));

scene.add(island, water, shipGroup, plane);

const controller = new AirplaneController(plane, {
  maxSpeed:        120,
  accelResponse:   2.2,
  drag:            0.015,
  pitchLimit:      THREE.MathUtils.degToRad(45),
  bankLimit:       THREE.MathUtils.degToRad(60),
  pitchCmdRateDeg: 60,
  bankCmdRateDeg:  90,
  pitchResponse:   5.0,
  bankResponse:    6.0,
  pitchCentering:  1.0,
  bankCentering:   1.5,
  turnRateGain:    1.3,
  yawTaxiRate:     Math.PI * 1.4,
  stallSpeed:      12,
  ctrlVRange:      25,
  minY:            PLANE_INITIAL_Y,
});


//===========Mutable State===========
let turretTheta    = 0; // current yaw angle (rad)
let turretPhi      = 0; // current pitch angle (rad)
let turretYawCmd   = 0; // -1 left | 0 | +1 right
let turretPitchCmd = 0; // -1 up   | 0 | +1 down

const clock       = new THREE.Clock();
const projectiles: Projectile[] = [];
const explosions:  Explosion[]  = [];
const targets     = [island, plane];


//===========HUD===========
const hudEl = document.getElementById('hud');

function updateHUD(): void {
  if (!hudEl) return;
  const s = controller.getStatus();
  hudEl.innerHTML =
    `<b>— Flight —</b><br>` +
    `Vel: ${s.speed.toFixed(1)} u/s<br>` +
    `Throttle: ${(controller.getEnginePower() * 100) | 0}%<br>` +
    `Pitch/Bank: ${s.pitchDeg.toFixed(0)}° / ${s.bankDeg.toFixed(0)}°<br>` +
    `Camera: ${cameras[activeCameraIndex].name}<br>` +
    `<br>` +
    `<b>— Controls —</b><br>` +
    `W / S &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Throttle up / down<br>` +
    `↑ / ↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Pitch up / down<br>` +
    `← / → &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Bank / steer<br>` +
    `J / L &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Turret left / right<br>` +
    `I / K &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Cannon up / down<br>` +
    `Space &nbsp;&nbsp;&nbsp;&nbsp; Fire<br>` +
    `R &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Reset plane<br>` +
    `C / 1-6 &nbsp;&nbsp; Switch camera<br>` +
    `<br>` +
    `<b>— Cameras —</b><br>` +
    `1 &nbsp; Free (OrbitControls)<br>` +
    `2 &nbsp; Plane chase<br>` +
    `3 &nbsp; Plane cockpit<br>` +
    `4 &nbsp; Ship orbital<br>` +
    `5 &nbsp; Ship chase<br>` +
    `6 &nbsp; Ship cannon<br>`;
}


//===========Camera Helpers===========
function updatePlaneCameras(): void {
  const planePos  = plane.position;
  const planeQuat = plane.quaternion;

  const forward = new THREE.Vector3();
  plane.getWorldDirection(forward);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeQuat);

  // Third-person: behind and above
  planeTPCamera.position.copy(planePos)
    .add(forward.clone().multiplyScalar(-PLANE_TP_OFFSET_Z))
    .add(right.clone().multiplyScalar(PLANE_TP_OFFSET_X))
    .add(new THREE.Vector3(0, PLANE_TP_OFFSET_Y, 0));
  planeTPCamera.lookAt(planePos);

  // First-person: cockpit
  planeFPCamera.position.copy(planePos)
    .add(forward.clone().multiplyScalar(PLANE_FP_OFFSET_Z))
    .add(right.clone().multiplyScalar(PLANE_FP_OFFSET_X))
    .add(new THREE.Vector3(0, PLANE_FP_OFFSET_Y, 0));
  planeFPCamera.quaternion.copy(planeQuat);
  planeFPCamera.lookAt(planeFPCamera.position.clone().add(forward));
}

function updateShipCameras(): void {
  const shipWorldPos = new THREE.Vector3();
  ship.getWorldPosition(shipWorldPos);

  controls.enabled            = (activeCameraIndex === 0);
  shipOrbitalControls.enabled = (activeCameraIndex === 3);

  // Orbital: keep OrbitControls target on ship center
  shipOrbitalControls.target.copy(shipWorldPos.clone().add(new THREE.Vector3(0, 20, 0)));
  shipOrbitalControls.update();

  // Chase: behind stern, above
  const shipStern = new THREE.Vector3(-1, 0, 0).applyQuaternion(ship.quaternion);
  shipChaseCamera.position.copy(shipWorldPos)
    .add(shipStern.multiplyScalar(200))
    .add(new THREE.Vector3(0, 60, 0));
  shipChaseCamera.lookAt(shipWorldPos);

  // Cannon: behind barrel
  if (cannonObj) {
    const cannonWorldPos = new THREE.Vector3();
    cannonObj.getWorldPosition(cannonWorldPos);
    const cannonQuat = new THREE.Quaternion();
    cannonObj.getWorldQuaternion(cannonQuat);
    const barrelDir = new THREE.Vector3(1, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
      .applyQuaternion(cannonQuat);
    shipCannonCamera.position.copy(cannonWorldPos)
      .add(barrelDir.clone().multiplyScalar(-80))
      .add(new THREE.Vector3(0, 15, 0));
    shipCannonCamera.lookAt(cannonWorldPos.clone().add(barrelDir.clone().multiplyScalar(60)));
  }
}


//===========Event Listeners===========

// Turret controls
window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyL': turretYawCmd   = -1; break;
    case 'KeyJ': turretYawCmd   = +1; break;
    case 'KeyI': turretPitchCmd = -1; break;
    case 'KeyK': turretPitchCmd = +1; break;
    case 'Space': {
      const projectile = fireProjectile(projectiles, cannonObj);
      if (projectile) scene.add(projectile);
      break;
    }
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyJ':
    case 'KeyL': turretYawCmd   = 0; break;
    case 'KeyI':
    case 'KeyK': turretPitchCmd = 0; break;
  }
});

// Camera switch
window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyC':
      activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
      break;
    default:
      if (/^[1-8]$/.test(e.key)) {
        const index = Number(e.key) - 1;
        if (index < cameras.length) activeCameraIndex = index;
      }
      break;
  }
});

// Plane controls
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    controller.setTransform({
      position: new THREE.Vector3(PLANE_INITIAL_X, PLANE_INITIAL_Y, PLANE_INITIAL_Z),
      euler:    new THREE.Euler(0, PLANE_INITIAL_ANGLE, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      throttle: 0,
    });
  }
});


//===========Animation Loop===========
function animate(): void {
  const dt = Math.min(0.05, clock.getDelta()); // clamped in case tab is paused

  controller.update(dt);
  rotateShip(shipGroup, 0.001);
  rotateBlades(controller.getEnginePower());

  updatePlaneCameras();
  updateShipCameras();

  // Turret / cannon
  if (turretObj) {
    turretTheta = THREE.MathUtils.clamp(
      turretTheta + turretYawCmd * TURRET_YAW_RATE * dt,
      MIN_TURRET_THETA, MAX_TURRET_THETA
    );
    turretObj.rotation.y = turretTheta;
  }

  if (cannonObj) {
    turretPhi = THREE.MathUtils.clamp(
      turretPhi + turretPitchCmd * TURRET_PITCH_RATE * dt,
      MIN_TURRET_PHI, MAX_TURRET_PHI
    );
    cannonObj.rotation.z = cannonInitialRotationZ - turretPhi;
  }

  // Projectiles
  const now = performance.now() / 1000;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    updateProjectile(p, dt);

    checkForCollisions(p, targets, () => {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      const explosion = createExplosion(p.mesh.position.clone());
      if (explosion) {
        explosions.push(explosion);
        scene.add(explosion.sprite);
      }
    });

    if (now - p.spawnTime > PROJECTILE_LIFETIME) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }

  // Explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    if (updateExplosion(e, dt)) {
      scene.remove(e.sprite);
      explosions.splice(i, 1);
    }
  }

  updateHUD();
  renderer.render(scene, cameras[activeCameraIndex]);
}

renderer.setAnimationLoop(animate);
