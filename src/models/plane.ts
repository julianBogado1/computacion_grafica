import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

//===========Types===========

type MotorProps = {
  motorLength: number;
  motorRadius: number;
  bladeLength: number;
  bladeWidth: number;
  bladeDepth: number;
  startingBladeAngle: number;
  bladeGroup: THREE.Group;
};

type FrontProps = {
  a0: number;
  b0: number;
  a1: number;
  b1: number;
  span: number;
};

type BackProps = {
  smallRadius: number;
  bigRadius: number;
  longitude: number;
};

type TailWingProps = {
  smallRadius: number;
  thickness: number;
};

type NozzleProps = {
  smallRadius: number;
  bigRadius: number;
  length: number;
};


//===========Constants===========

const jayjayBlue = new THREE.Color(0x1E90FF);
const darkerBlue = new THREE.Color(0x1874CD);

const FUSELAGE_RADIUS = 30;
const WHEEL_RADIUS    = 8;
const STRUT_LENGTH    = 12;

export const LANDING_GEAR_OFFSET = FUSELAGE_RADIUS + STRUT_LENGTH + WHEEL_RADIUS / 2;

const bladeGroupLeft  = new THREE.Group();
const bladeGroupRight = new THREE.Group();


//===========Blade State===========

export let isBladesSpinning = 1;

export function rotateBlades(rotationSpeed = 0.3): void {
  bladeGroupLeft.rotateZ(rotationSpeed * isBladesSpinning);
  bladeGroupRight.rotateZ(-rotationSpeed * isBladesSpinning);
}

export function startBladeRotation(): void {
  isBladesSpinning = 1;
}

export function stopBladeRotation(): void {
  isBladesSpinning = 0;
}


//===========Public API===========

export function createPlane(): THREE.Group {
  return buildFuselage();
}


//===========Build Functions===========

function buildFuselage(): THREE.Group {
  const fuselageGroup = new THREE.Group();

  const tailWingProps: TailWingProps = { smallRadius: 15, thickness: 5 };
  const tail = buildTail(tailWingProps);

  const backProps: BackProps = { smallRadius: 15, bigRadius: 30, longitude: 100 };
  const bodyBack = buildBodyBack(backProps);

  const bodyLength = 150;
  const bodyFront  = buildBodyFront(30, bodyLength);
  bodyFront.rotateX(Math.PI / 2);
  bodyFront.position.z += backProps.longitude + bodyLength / 2;

  const frontProps: FrontProps = { a0: 25, b0: 5, a1: 10, b1: 2, span: 100 };

  const motorPropsRight: MotorProps = {
    motorLength: 25,
    motorRadius: 10,
    bladeLength: 10,
    bladeWidth: 5,
    bladeDepth: 1,
    startingBladeAngle: 0,
    bladeGroup: bladeGroupRight,
  };

  const motorPropsLeft: MotorProps = {
    ...motorPropsRight,
    startingBladeAngle: Math.PI / 4,
    bladeGroup: bladeGroupLeft,
  };

  const wing = buildWing(frontProps, motorPropsRight);
  wing.position.z += backProps.longitude + bodyLength / 2 + (frontProps.a0 - frontProps.b0);
  wing.rotateY(Math.PI / 2);
  wing.position.x += backProps.bigRadius;

  const wingLeft = buildWing(frontProps, motorPropsLeft);
  wingLeft.scale.x = -1;
  wingLeft.position.z += backProps.longitude + bodyLength / 2 + (frontProps.a0 - frontProps.b0);
  wingLeft.position.x -= backProps.bigRadius;
  wingLeft.rotateY(-Math.PI / 2);

  const nozzleProps: NozzleProps = { smallRadius: 25, bigRadius: 30, length: 15 };
  const nozzle = buildNozzle(nozzleProps);
  nozzle.position.z += backProps.longitude + bodyLength;

  const landingGear = buildLandingGear();

  // fuselageGroup.add(wing, wingLeft);
  fuselageGroup.add(tail, bodyBack, bodyFront, wing, wingLeft, nozzle, landingGear);

  return fuselageGroup;
}

function buildBodyFront(radius = 30, length = 100): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(radius, radius, length);
  const mat  = new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide });
  return new THREE.Mesh(geom, mat);
}

function buildWing(
  { span = 100, a0 = 25, b0 = 5, a1 = 10, b1 = 2 }: FrontProps,
  motorProps: MotorProps,
): THREE.Group {
  const wingGroup = new THREE.Group();

  // Wing surface
  const geom = new ParametricGeometry(parametricWingFunction(span, a0, b0, a1, b1), 100, 100);
  const mat  = new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide });
  const wing = new THREE.Mesh(geom, mat);

  // Elliptic wingtip cap
  const shape = new THREE.Shape();
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = a1 * Math.cos(t);
    const y = b1 * Math.sin(t);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const cap = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide }),
  );
  cap.position.z += span;

  // Motor
  const motor = buildMotor(motorProps);
  motor.position.set(
    wing.position.x + motorProps.motorLength / 2,
    wing.position.y,
    wing.position.z + span / 2,
  );
  motor.rotateY(-Math.PI / 2);

  wingGroup.add(wing, cap, motor);
  return wingGroup;
}

function parametricWingFunction(span = 100, a0 = 25, b0 = 5, a1 = 10, b1 = 2) {
  return function(u: any, v: any, target: THREE.Vector3) {
    const a     = a0 + u * (a1 - a0);
    const b     = b0 + u * (b1 - b0);
    const theta = v * Math.PI * 2;
    target.set(a * Math.cos(theta), b * Math.sin(theta), span * u);
  };
}

function buildTail({ smallRadius = 25, thickness = 5 }: TailWingProps): THREE.Group {
  const tailGroup = new THREE.Group();

  const tail = new THREE.Mesh(
    new THREE.CircleGeometry(smallRadius),
    new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide }),
  );

  const tailWingTop = buildTailWing();
  tailWingTop.rotateY(-Math.PI / 2);
  tailWingTop.position.set(thickness / 2, smallRadius, 0);

  const tailWingLeft = tailWingTop.clone();
  tailWingLeft.position.set(-smallRadius, thickness / 2, 0);
  tailWingLeft.rotateX(Math.PI / 2);

  const tailWingRight = tailWingTop.clone();
  tailWingRight.position.set(smallRadius, -thickness / 2, 0);
  tailWingRight.rotateX(-Math.PI / 2);

  tailGroup.add(tail, tailWingLeft, tailWingTop, tailWingRight);
  return tailGroup;
}

function buildTailWing(height = 25, width = 10, thickness = 5): THREE.Mesh {
  const squareHeight = height / 2;
  const totalHeight  = height;

  // 2D side profile: rectangular bottom + sloped top
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(width, 0);
  tailShape.lineTo(width, squareHeight);
  tailShape.lineTo(width * 0.4, totalHeight);
  tailShape.lineTo(0, totalHeight);
  tailShape.lineTo(0, 0);

  const tailGeometry = new THREE.ExtrudeGeometry(tailShape, { depth: thickness, bevelEnabled: false });
  const tailMaterial = new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide });
  return new THREE.Mesh(tailGeometry, tailMaterial);
}

function buildBodyBack({ smallRadius = 25, bigRadius = 50, longitude = 100 }: BackProps): THREE.Mesh {
  const geom = new ParametricGeometry(getParametricFuselageFunction(smallRadius, bigRadius, longitude), 100, 100);
  const mat  = new THREE.MeshPhongMaterial({ color: jayjayBlue, side: THREE.DoubleSide });
  return new THREE.Mesh(geom, mat);
}

function getParametricFuselageFunction(smallRadius: number, bigRadius: number, longitude: number) {
  return function(u: any, v: any, target: THREE.Vector3) {
    const radius = smallRadius + (bigRadius - smallRadius) * u;
    const theta  = v * Math.PI * 2;
    target.set(radius * Math.cos(theta), radius * Math.sin(theta), u * longitude);
  };
}

function buildLandingGear(): THREE.Group {
  const gear    = new THREE.Group();
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
  const strutMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
  const strutGeom = new THREE.CylinderGeometry(2, 2, STRUT_LENGTH);
  const wheelGeom = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 5);

  function makeWheelAssembly(x: number, z: number): THREE.Group {
    const assembly = new THREE.Group();

    const strut = new THREE.Mesh(strutGeom, strutMat);
    strut.position.y = -(FUSELAGE_RADIUS + STRUT_LENGTH / 2);

    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.z = Math.PI / 2; // lay the cylinder on its side so it rolls in Z
    wheel.position.y = -(FUSELAGE_RADIUS + STRUT_LENGTH);

    assembly.add(strut, wheel);
    assembly.position.set(x, 0, z);
    return assembly;
  }

  // Two main wheels under the body, one nose wheel
  gear.add(makeWheelAssembly(-15, 150));
  gear.add(makeWheelAssembly( 15, 150));
  gear.add(makeWheelAssembly(  0, 220));

  return gear;
}

function buildNozzle({ smallRadius = 15, bigRadius = 30, length = 15 }: NozzleProps): THREE.Group {
  const texture = new THREE.TextureLoader().load('textures/plane/jayjay.png');

  const nozzle = new THREE.Mesh(
    new ParametricGeometry(parametricNozzle(smallRadius, bigRadius, length), 100, 100),
    new THREE.MeshPhongMaterial({ color: darkerBlue, side: THREE.DoubleSide }),
  );

  const capMesh = new THREE.Mesh(
    new THREE.CircleGeometry(smallRadius, 120),
    new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, map: texture }),
  );
  capMesh.position.z += length;

  const nozzleGroup = new THREE.Group();
  nozzleGroup.add(nozzle, capMesh);
  return nozzleGroup;
}

function parametricNozzle(smallRadius = 15, bigRadius = 30, length = 15) {
  return function(u: any, v: any, target: THREE.Vector3) {
    const radius = bigRadius - (bigRadius - smallRadius) * u;
    const theta  = v * Math.PI * 2;
    target.set(radius * Math.cos(theta), radius * Math.sin(theta), u * length);
  };
}

function buildMotor({
  motorLength,
  motorRadius,
  bladeLength,
  bladeWidth,
  bladeDepth,
  startingBladeAngle,
  bladeGroup,
}: MotorProps): THREE.Group {
  const motor = new THREE.Mesh(
    new ParametricGeometry(parametricMotor(motorLength, motorRadius), 100, 100),
    new THREE.MeshPhongMaterial({ color: darkerBlue, side: THREE.DoubleSide }),
  );

  const bladeGeom = new THREE.BoxGeometry(bladeLength, bladeWidth, bladeDepth);
  const bladeMat  = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });

  const blade = new THREE.Mesh(bladeGeom, bladeMat);
  blade.position.z += motorLength + motorRadius + bladeDepth / 2;
  blade.position.x += bladeLength / 2;

  const blade2 = blade.clone();
  blade2.rotateZ(Math.PI);
  blade2.position.x -= bladeLength;

  const blade3 = blade.clone();
  blade3.rotateZ(Math.PI / 2);
  blade3.position.x -= bladeWidth;
  blade3.position.y += bladeLength / 2;

  const blade4 = blade3.clone();
  blade4.position.y -= bladeLength;

  bladeGroup.add(blade, blade2, blade3, blade4);
  bladeGroup.rotateZ(startingBladeAngle);

  const motorGroup = new THREE.Group();
  motorGroup.add(motor, bladeGroup);
  return motorGroup;
}

function parametricMotor(length = 25, radius = 10) {
  return function(u: any, v: any, target: THREE.Vector3) {
    const theta = 2 * Math.PI * v;
    let r = 0, z = 0;

    if (u < 0.3) {
      // Front hemisphere
      const phi = (1 - u / 0.3) * (Math.PI / 2);
      r = radius * Math.cos(phi);
      z = -radius * Math.sin(phi);
    } else if (u <= 0.7) {
      // Central cylinder
      r = radius;
      z = u * length;
    } else {
      // Rear hemisphere
      const phi = ((u - 0.7) / 0.3) * (Math.PI / 2);
      r = radius * Math.cos(phi);
      z = length + radius * Math.sin(phi);
    }

    target.set(r * Math.cos(theta), r * Math.sin(theta), z);
  };
}
