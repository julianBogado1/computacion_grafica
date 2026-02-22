import './style.css'
import * as THREE from 'three';
import * as dat from 'dat.gui';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createIsland, AIRPORT_HEIGHT, AIRPORT_POSITION, AIRPORT_ROTATION_Y } from './models/island';
import { createSea, SEA_LEVEL } from './models/sea';
import { createShip, rotateShip } from './models/ship';
import { createPlane, isBladesSpinning, rotateBlades, startBladeRotation, stopBladeRotation, LANDING_GEAR_OFFSET } from './models/plane';
import { AirplaneController} from './utils/airplaneController.js';
import { checkForCollisions, fireProjectile, updateProjectile } from './models/projectile';
import { createExplosion, updateExplosion, loadExplosionGif } from './models/explosion.js';
import type { Projectile } from './models/projectile';
import type { Explosion } from './models/explosion.js';



const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);

//===========Scene, Camera, Light===========
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 100, window.innerWidth / window.innerHeight, 0.1, 10000 );
camera.name = "MainCamera";

const planeTPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
planeTPCamera.name = "PlaneTPCamera";


const planeFPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
planeFPCamera.name = "PlaneFPCamera";

// Ship cameras
const shipOrbitalCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
shipOrbitalCamera.name = "ShipOrbitalCamera";

const shipChaseCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
shipChaseCamera.name = "ShipChaseCamera";

const shipCannonCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
shipCannonCamera.name = "ShipCannonCamera";


const planeTPCameraOffsetX = 0;
const planeTPCameraOffsetY = 20;
const planeTPCameraOffsetZ = 200;

// First-person: slightly forward / cockpit position
const planeFPCameraOffsetX = 0;
const planeFPCameraOffsetY = 5;
const planeFPCameraOffsetZ = 400;


const light = new THREE.AmbientLight( 0xffffff, 0.5 ); // soft fill light
const sunLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
sunLight.position.set( 500, 800, 300 );
sunLight.castShadow = true;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 3000;
sunLight.shadow.camera.left = -700;
sunLight.shadow.camera.right = 700;
sunLight.shadow.camera.top = 700;
sunLight.shadow.camera.bottom = -700;
camera.position.set(0, 300, 300);
scene.add( light, sunLight );

const cameras = [camera, planeTPCamera, planeFPCamera, shipOrbitalCamera, shipChaseCamera, shipCannonCamera];
let activeCameraIndex = 0;

//===========Orbit Controls===========
const controls = new OrbitControls( camera, renderer.domElement );
controls.dampingFactor = 0.25;
controls.update();

// Separate OrbitControls for the ship orbital camera (shares same canvas)
const shipOrbitalControls = new OrbitControls( shipOrbitalCamera, renderer.domElement );
shipOrbitalControls.dampingFactor = 0.25;
shipOrbitalControls.enabled = false; // only active when shipOrbitalCamera is selected



//===========Floor Grid===========
const grid = new THREE.GridHelper( 2000, 100 );
grid.position.y = - 199;
grid.material.opacity = 0.25;
grid.material.transparent = true;
scene.add( grid );

//===========Axes Helper===========
const axesHelper = new THREE.AxesHelper( 100 );
scene.add( axesHelper );


//===========Models===========



await loadExplosionGif();
let island = await createIsland();
let water = createSea();
water.position.y = SEA_LEVEL; // nivel del mar


const INITIAL_SHIP_POSITION = new THREE.Vector3(0, SEA_LEVEL+8, 650);
const shipParts = await createShip();
let shipGroup = new THREE.Group();
const ship = shipParts.wrapper;
ship.position.copy(INITIAL_SHIP_POSITION);
ship.scale.set(2,2,2);

shipGroup.add(ship);
const turretObj = shipParts.turret as THREE.Object3D | null;
const cannonObj = shipParts.cannon as THREE.Object3D | null;
const cannonInitialRotationZ = cannonObj ? cannonObj.rotation.z : 0;

const turretAxes = new THREE.AxesHelper(30);
turretObj.add(turretAxes);
const cannonAxes = new THREE.AxesHelper(20);
cannonObj.add(cannonAxes);


const cosA = Math.cos(AIRPORT_ROTATION_Y);
const sinA = Math.sin(AIRPORT_ROTATION_Y);
const runwayLocalX = -105; // slightly inside the start end of the runway
const streetLocalZ = 25;   // street offset in airport local space

const planeInitialX = AIRPORT_POSITION.x + runwayLocalX * cosA + streetLocalZ * sinA;
const planeInitialY = AIRPORT_HEIGHT + LANDING_GEAR_OFFSET*0.4; 
const planeInitialZ = AIRPORT_POSITION.z - runwayLocalX * sinA + streetLocalZ * cosA;
const planeInitialAngle = -AIRPORT_ROTATION_Y; // face along the runway toward the far end
let plane = createPlane();
plane.scale.set(0.25, 0.25, 0.25);
plane.position.set(planeInitialX, planeInitialY, planeInitialZ);
plane.rotateY(planeInitialAngle);

const controller = new AirplaneController(plane, {
  maxSpeed: 120,
  accelResponse: 2.2,
  drag: 0.015,

  pitchLimit: THREE.MathUtils.degToRad(45),
  bankLimit:  THREE.MathUtils.degToRad(60),

  pitchCmdRateDeg: 60,
  bankCmdRateDeg:  90,

  pitchResponse: 5.0,
  bankResponse:  6.0,

  pitchCentering: 1.0,
  bankCentering:  1.5,

  turnRateGain: 1.3,
  yawTaxiRate: Math.PI * 1.4,

  stallSpeed: 12,
  ctrlVRange: 25,

  minY: planeInitialY
});

scene.add( island, water, shipGroup, plane );

// Position ship orbital camera with a starting offset above/behind the ship
shipOrbitalCamera.position.set(
  INITIAL_SHIP_POSITION.x,
  INITIAL_SHIP_POSITION.y + 120,
  INITIAL_SHIP_POSITION.z - 220
);
shipOrbitalControls.target.copy(INITIAL_SHIP_POSITION);




//===========HUD / GUI===========
const hudEl = document.getElementById('hud');
function updateHUD() {
  if (!hudEl) return;
  const s = controller.getStatus();
  hudEl.innerHTML =
    `<b>— Flight —</b><br>` +
    `Vel: ${s.speed.toFixed(1)} u/s<br>` +
    `Throttle: ${(controller.getEnginePower()*100)|0}%<br>` +
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

//===========Listeners===========

let turretTheta = 0; // current yaw angle (rad)
let turretPhi = 0;   // current pitch angle (rad)
// command inputs: -1,0,+1
let turretYawCmd = 0;    // -1 left, +1 right
let turretPitchCmd = 0;  // -1 up, +1 down
const turretYawRate = THREE.MathUtils.degToRad(60);   // rad/s
const turretPitchRate = THREE.MathUtils.degToRad(30); // rad/s
const maxTurretTheta = THREE.MathUtils.degToRad(90); // ±90 grados
const minTurretTheta = THREE.MathUtils.degToRad(-90);
const maxTurretPhi = THREE.MathUtils.degToRad(0);   // max down (degrees)
const minTurretPhi = THREE.MathUtils.degToRad(-90);   // max up (allow small upward angle)


//====================== Turret Controls =======================
window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyL': turretYawCmd = -1; break; // left
    case 'KeyJ': turretYawCmd = +1; break; // right
    case 'KeyI': turretPitchCmd = -1; break; // up (negative reduces pitch)
    case 'KeyK': turretPitchCmd = +1; break; // down (positive increases pitch)
    case 'Space':
      const projectile = fireProjectile(projectiles, cannonObj);
      if (projectile) scene.add(projectile);
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyJ':
    case 'KeyL': turretYawCmd = 0; break;
    case 'KeyI':
    case 'KeyK': turretPitchCmd = 0; break;
  }
});


//cambio de camara secuencial
window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyC':
            // cycle camera index only; no need to add/remove cameras from scene
            activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
            break;
        default:
            if (/^[1-8]$/.test(e.key)) {
                const index = Number(e.key) - 1;
                if (index < cameras.length) {
                  activeCameraIndex = index;
                }
            }
            break;
    }
  
});

// =============== Plane controls ===============
window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyR':
            controller.setTransform({
                position: new THREE.Vector3(planeInitialX, planeInitialY, planeInitialZ),
                euler: new THREE.Euler(0, planeInitialAngle, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                throttle: 0
            });
    }
  
});

const clock = new THREE.Clock();
const projectiles : Projectile[] = [];
const projectileLifetime = 5;
const explosions: Explosion[] = [];
const targets = [island, plane]; 

function animate() {
    
    const dt = Math.min(0.05, clock.getDelta()); // clamp por si se pausa un tab
    controller.update(dt);
    rotateShip(shipGroup, 0.005);
    rotateBlades(controller.getEnginePower());

    //================= Plane Cameras =================
    const planePos = plane.position;
    const planeQuat = plane.quaternion;
    
    const forward = new THREE.Vector3();
    plane.getWorldDirection(forward); 
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeQuat);

    // Third-person camera: place behind and above the plane using forward/right
    const tpDistance = Math.abs(planeTPCameraOffsetZ); // 200
    planeTPCamera.position.copy(planePos)
      .add(forward.clone().multiplyScalar(-tpDistance)) // go behind the plane
      .add(right.clone().multiplyScalar(planeTPCameraOffsetX)) // lateral offset
      .add(new THREE.Vector3(0, planeTPCameraOffsetY, 0)); // vertical offset
    planeTPCamera.lookAt(planePos);

    //First-person camera: attach near cockpit and match plane orientation
    const fpForwardDist = Math.abs(planeFPCameraOffsetZ); // 20
    planeFPCamera.position.copy(planePos)
      .add(forward.clone().multiplyScalar(fpForwardDist)) // forward from plane position
      .add(right.clone().multiplyScalar(planeFPCameraOffsetX))
      .add(new THREE.Vector3(0, planeFPCameraOffsetY, 0));
    // Match plane orientation so FPCamera looks where the plane is pointing
    planeFPCamera.quaternion.copy(planeQuat);
    planeFPCamera.lookAt(planeFPCamera.position.clone().add(forward));

    //================= Ship Cameras =================
    const shipWorldPos = new THREE.Vector3();
    ship.getWorldPosition(shipWorldPos);

    // Enable/disable the right OrbitControls based on active camera
    controls.enabled = (activeCameraIndex === 0);
    shipOrbitalControls.enabled = (activeCameraIndex === 3);

    // Ship Orbital: keep OrbitControls target locked to ship world position, then update
    shipOrbitalControls.target.copy(shipWorldPos.add(new THREE.Vector3(0, 20, 0))); // look at ship center + some vertical offset
    shipOrbitalControls.update();

    // Ship Chase: sit behind the stern (local -X axis) and above, looking at the ship
    // Hull runs along local X; bow faces +X so stern is in the -X direction
    const shipStern = new THREE.Vector3(-1, 0, 0).applyQuaternion(ship.quaternion);
    shipChaseCamera.position.copy(shipWorldPos)
      .add(shipStern.clone().multiplyScalar(200)) // behind stern
      .add(new THREE.Vector3(0, 60, 0));           // above
    shipChaseCamera.lookAt(shipWorldPos);

    // Ship Cannon: sit behind the barrel, looking along the barrel direction
    if (cannonObj) {
      const cannonWorldPos = new THREE.Vector3();
      cannonObj.getWorldPosition(cannonWorldPos);
      const cannonQuat = new THREE.Quaternion();
      cannonObj.getWorldQuaternion(cannonQuat);
      // barrel points along local +X rotated 90° around Z  → same direction as projectile firing
      const barrelDir = new THREE.Vector3(1, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
        .applyQuaternion(cannonQuat);
      shipCannonCamera.position.copy(cannonWorldPos)
        .add(barrelDir.clone().multiplyScalar(-80)) // behind barrel
        .add(new THREE.Vector3(0, 15, 0));           // slightly above
      shipCannonCamera.lookAt(cannonWorldPos.clone().add(barrelDir.clone().multiplyScalar(60)));
    }

    // update turret/cannon using command inputs and dt
    // yaw rotates the turret (parent), pitch rotates the cannon local X

    if (turretObj) {
      turretTheta += turretYawCmd * turretYawRate * dt;
      turretTheta = THREE.MathUtils.clamp(turretTheta, minTurretTheta, maxTurretTheta);
      turretObj.rotation.y = turretTheta;
    }

    if (cannonObj) {
      turretPhi += turretPitchCmd * turretPitchRate * dt;
      turretPhi = THREE.MathUtils.clamp(turretPhi, minTurretPhi, maxTurretPhi);
      cannonObj.rotation.z = cannonInitialRotationZ - turretPhi;
    }

    // ================= Projectiles =================
    const now = performance.now() / 1000;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      updateProjectile(p, dt);

      checkForCollisions(p, targets, () => {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        const explosion = createExplosion(p.mesh.position.clone());
        if(explosion){
          explosions.push(explosion);
          scene.add(explosion.sprite);
        }
      });

      // simple lifetime check
      if (now - p.spawnTime > projectileLifetime) {
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
      }
    }

    // ================= Explosions =================
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      const done = updateExplosion(e, dt);
      if (done) {
        scene.remove(e.sprite);
        explosions.splice(i, 1);
      }
    }

    updateHUD();
    renderer.render(scene, cameras[activeCameraIndex]);
}
renderer.setAnimationLoop( animate );
