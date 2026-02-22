import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

type MotorProps = {
    motorLength:number,
    motorRadius:number,
    bladeLength:number,
    bladeWidth:number,
    bladeDepth:number,
    startingBladeAngle:number,
    bladeGroup: THREE.Group
};
type FrontProps = {
    a0: number;
    b0:number,
    a1: number,
    b1: number;
    span: number;
};
type BackProps = {
    smallRadius:number,
    bigRadius:number,
    longitude:number
};
type TailWingProps = {
    smallRadius:number,
    thickness:number
};

type NozzleProps = {
    smallRadius:number,
    bigRadius:number,
    length:number
}
const jayjayBlue = new THREE.Color(0x1E90FF);
const darkerBlue = new THREE.Color(0x1874CD);

const FUSELAGE_RADIUS = 30;
const WHEEL_RADIUS = 8;
const STRUT_LENGTH = 12;
export const LANDING_GEAR_OFFSET = FUSELAGE_RADIUS + STRUT_LENGTH + WHEEL_RADIUS/2; // distance from plane origin to ground
const bladeGroupLeft = new THREE.Group();
const bladeGroupRight = new THREE.Group();


function createPlane() : THREE.Mesh{

    return buildFuselage();
}

function buildFuselage() : THREE.Mesh{
    let fuselageGroup = new THREE.Group();
    // //tail

    const tailWingProps : TailWingProps = {
       smallRadius: 15,
       thickness: 5
    };
    const smallRadius = 15;
    const bigRadius = 30;
    const longitude = 100;
    // thickness
    const tail = buildTail(tailWingProps);

    const backProps : BackProps = {
       smallRadius: smallRadius,
       bigRadius: bigRadius,
       longitude: longitude
    };
    const bodyBack = buildBodyBack(backProps);

    // //Front
    const bodyLength = 150;
    // bigradius
    const bodyFront = builBodyFront(bigRadius, bodyLength);
    bodyFront.rotateX(Math.PI/2);
    bodyFront.position.z += longitude+(bodyLength/2);
    const frontProps : FrontProps = {
        a0:25,
        b0:5,
        a1:10,
        b1:2,
        span:100
    };

    const motorPropsRight : MotorProps = {
        motorLength: 25,
        motorRadius: 10,
        bladeLength: 10,
        bladeWidth :5,
        bladeDepth: 1,
        startingBladeAngle: 0,
        bladeGroup: bladeGroupRight,
    };

    const motorPropsLeft : MotorProps = {
    ...motorPropsRight,  // spread operator copia las propiedades
    startingBladeAngle: Math.PI/4,
    bladeGroup: bladeGroupLeft
    };

    const wing = buildWing(frontProps, motorPropsRight);
    wing.position.z += (longitude+bodyLength/2+(frontProps.a0-frontProps.b0));
    wing.rotateY(Math.PI/2);
    wing.position.x += bigRadius;

    const wingLeft = buildWing(frontProps, motorPropsLeft);
    wingLeft.scale.x = -1;
    wingLeft.position.z += (longitude+bodyLength/2+(frontProps.a0-frontProps.b0));
    wingLeft.position.x -= bigRadius;
    wingLeft.rotateY(-Math.PI/2);

    //nozzle
    const nozzleProps = {
        smallRadius: 25,
        bigRadius: 30,
        length: 15
    }
    const nozzle = buildNozzle(nozzleProps);
    nozzle.position.z += longitude + bodyLength;
    


    const landingGear = buildLandingGear();

    // fuselageGroup.add(wing, wingLeft);
    fuselageGroup.add(tail, bodyBack, bodyFront, wing, wingLeft, nozzle, landingGear);


    
    return fuselageGroup;
}

function builBodyFront(radius=30, length=100): THREE.Msh{
    
    const geom = new THREE.CylinderGeometry(radius, radius, length);
    const mat = new THREE.MeshPhongMaterial({ color: jayjayBlue ,  side:THREE.DoubleSide});
    const mesh = new THREE.Mesh(geom, mat);
    return mesh;
}

function buildWing(
    {span=100, a0 = 25, b0 = 5, a1 = 10,  b1 = 2} : FrontProps,
    motorProps: MotorProps) : THREE.Mesh{
    
    const wingGroup = new THREE.Group();

    //build wing
    const geom = new ParametricGeometry(parametricWingFunction(span, a0, b0, a1, b1), 100, 100);
    const mat = new THREE.MeshPhongMaterial({ color: jayjayBlue , side:THREE.DoubleSide});
    const wing = new THREE.Mesh(geom, mat);

    const shape = new THREE.Shape();

    //build elliptic cap
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const x = a1 * Math.cos(t);
        const y = b1 * Math.sin(t);

        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshPhongMaterial({ color: jayjayBlue , side:THREE.DoubleSide});
    const cap = new THREE.Mesh(geometry, material);
    cap.position.z +=span;

    //motors

    const motor = buildMotor(motorProps);
    motor.position.set(wing.position.x + motorProps.motorLength/2, wing.position.y, wing.position.z + span/2)
    motor.rotateY(-Math.PI/2);

    wingGroup.add(wing, cap, motor);
    return wingGroup;
}

function parametricWingFunction(span=100, a0 = 25, b0 = 5, a1 = 10,  b1 = 2){
    return function (u: any, v:any, target:THREE.Vector3) {
        // u: 0 → 1   (envergadura)
        // v: 0 → 2π  (ángulo del contorno elíptico)

        // tamaño de la elipse interpolado
        const a = a0 + u * (a1 - a0);
        const b = b0 + u * (b1 - b0);

        // ángulo
        const theta = v * Math.PI * 2;

        // forma elíptica correcta
        const x = a * Math.cos(theta);
        const y = b * Math.sin(theta);

        // avance en envergadura
        const z = span * u;
		target.set(x, y, z);
	};
}

function buildTail({smallRadius=25, thickness=5} : TailWingProps) : THREE.Mesh{
    const tailGroup = new THREE.Group();
    let tailGeom = new THREE.CircleGeometry(smallRadius);
    const tailMesh = new THREE.MeshPhongMaterial( { color: jayjayBlue , side:THREE.DoubleSide} );
    const tail = new THREE.Mesh(tailGeom, tailMesh);

    let tailWingTop = buildTailWing();
    tailWingTop.rotateY(-Math.PI/2);
    tailWingTop.position.set(thickness/2,0,0);

    let tailWingLeft = tailWingTop.clone();
    tailWingLeft.position.set(-smallRadius, thickness/2, 0);
    let tailWingRight = tailWingTop.clone();
    tailWingRight.position.set(smallRadius, -thickness/2, 0);

    tailWingTop.position.set(thickness/2, smallRadius, 0);
    tailWingLeft.rotateX(Math.PI/2)
    tailWingRight.rotateX(-Math.PI/2)



    tailGroup.add(tail, tailWingLeft, tailWingTop, tailWingRight);
    return tailGroup;
}


function buildTailWing(height=25, width=10, thickness=5) : THREE.Mesh{
    // Sizes (tweak to taste)

    const squareHeight = height/2;   // vertical height of the rectangular bottom part
    const totalHeight = height;    // total tail height

    // 2D side profile (viewed from the side)
    // Bottom rectangle: (0,0) -> (width,0) -> (width,squareHeight)
    // Top sloped part: (width,squareHeight) -> (width * 0.4, totalHeight) -> (0,totalHeight)
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);
    tailShape.lineTo(width, 0);
    tailShape.lineTo(width, squareHeight);
    tailShape.lineTo(width * 0.4, totalHeight); // slope back toward the root
    tailShape.lineTo(0, totalHeight);
    tailShape.lineTo(0, 0); // close the shape

    // Extrude settings (thickness along Z)
    const extrudeSettings = {
    depth: thickness,
    bevelEnabled: false,
    };

    const tailGeometry = new THREE.ExtrudeGeometry(tailShape, extrudeSettings);
    const tailMaterial = new THREE.MeshPhongMaterial({ color: jayjayBlue, side:THREE.DoubleSide});
    const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
    return tailMesh;
}

function buildBodyBack({smallRadius=25, bigRadius=50, longitude=100} : BackProps) : THREE.Mesh{
    let fuselageGeom = new ParametricGeometry(getParametricFuselageFunction(smallRadius, bigRadius, longitude), 100, 100);
    const fuselageMaterial = new THREE.MeshPhongMaterial( { color: jayjayBlue , side:THREE.DoubleSide} );
    return new THREE.Mesh(fuselageGeom, fuselageMaterial);
}
function getParametricFuselageFunction(smallRadius: number, bigRadius: number, longitude: number){

    return function (u: any, v:any, target:THREE.Vector3) {
        let x = 0
        let y = 0
        let z = 0
        let radius = smallRadius + (bigRadius - smallRadius) * u;
        const theta = v * Math.PI * 2;
        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        z = u * longitude;
		target.set(x, y, z);
	};
}

function buildLandingGear(): THREE.Group {
    const gear = new THREE.Group();
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

    // Two main wheels under the body (spread left/right for stability)
    gear.add(makeWheelAssembly(-15, 150));
    gear.add(makeWheelAssembly( 15, 150));
    // Nose wheel under the front
    gear.add(makeWheelAssembly(0, 220));

    return gear;
}

function buildNozzle({smallRadius=15, bigRadius=30, length=15}: NozzleProps):THREE.Mesh{
    const geom = new ParametricGeometry(parametricNozzle(smallRadius, bigRadius, length), 100, 100);
    
    // Load texture once and reuse it
    const texture = new THREE.TextureLoader().load('textures/plane/jayjay.png');
    const mat = new THREE.MeshPhongMaterial({color: darkerBlue, side: THREE.DoubleSide});

    const nozzle = new THREE.Mesh(geom, mat);

    // Create cap with same texture
    const cap = new THREE.CircleGeometry(smallRadius, 120);
    const capMat = new THREE.MeshPhongMaterial(
        {
            side:THREE.DoubleSide,
            map: texture
        });
    const capMesh = new THREE.Mesh(cap, capMat);
    capMesh.position.z += length;  // Position at the end of nozzle
    
    const nozzleGroup = new THREE.Group();
    nozzleGroup.add(nozzle, capMesh);
    return nozzleGroup;
}

function parametricNozzle(smallRadius=15, bigRadius=30, length=15){
    return function (u: any, v:any, target:THREE.Vector3) {
        let x = 0
        let y = 0
        let z = 0
        let radius = bigRadius - (bigRadius - smallRadius) * u;
        const theta = v * Math.PI * 2;
        x = radius * Math.cos(theta);
        y = radius * Math.sin(theta);
        z = u * length;
		target.set(x, y, z);
	};
}

function buildMotor({
    motorLength,
    motorRadius,
    bladeLength,
    bladeWidth,
    bladeDepth,
    startingBladeAngle,
    bladeGroup
}: MotorProps):THREE.Nesh{
    
    const geom = new ParametricGeometry(parametricMotor(motorLength, motorRadius), 100, 100);
    const mat = new THREE.MeshPhongMaterial({ color: darkerBlue ,  side:THREE.DoubleSide});
    const motor = new THREE.Mesh(geom, mat);

    const bladeGeom = new THREE.BoxGeometry(bladeLength, bladeWidth, bladeDepth);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222222 ,  side:THREE.DoubleSide});
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.position.z+=motorLength + motorRadius + bladeDepth/2;
    blade.position.x+=bladeLength/2;

    const blade2 = blade.clone();
    blade2.rotateZ(Math.PI);
    blade2.position.x-=bladeLength;

    const blade3 = blade.clone();
    blade3.rotateZ(Math.PI/2);
    blade3.position.x-= bladeWidth;
    blade3.position.y += bladeLength/2

    const blade4 = blade3.clone();
    blade4.position.y -= bladeLength;

    bladeGroup.add(blade, blade2, blade3, blade4);
    bladeGroup.rotateZ(startingBladeAngle);

    const motorGroup = new THREE.Group();
    motorGroup.add(motor, bladeGroup);
    return motorGroup;
}

function parametricMotor(length=25, radius=10){
    return function (u: any, v: any, target: THREE.Vector3) {
        let x, y, z, r, theta;
        theta = 2 * Math.PI * v;
        
        if (u < 0.3) {
            // Primera semiesfera (extremo inferior)
            const phi = (1-u / 0.3) * (Math.PI / 2); // mapea [0, 0.3] a [0, π/2]
            r = radius * Math.cos(phi);
            z = -radius * Math.sin(phi); // semiesfera hacia abajo
        }
        else if (u >= 0.3 && u <= 0.7) {
            // Cilindro central
            r = radius;
            z = (u) * length; // mapea [0.3, 0.7] a [0, length]
        }
        else {
            // Segunda semiesfera (extremo superior)
            const phi = ((u - 0.7) / 0.3) * (Math.PI / 2); // mapea [0.7, 1] a [0, π/2]
            r = radius * Math.cos(phi);
            z = length + radius * Math.sin(phi); // semiesfera hacia arriba
        }
        
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        target.set(x, y, z);
    };
}
let isBladesSpinning = 1;
function rotateBlades(rotationSpeed=0.3){
    bladeGroupLeft.rotateZ(rotationSpeed * isBladesSpinning);
    bladeGroupRight.rotateZ(-rotationSpeed * isBladesSpinning);
}
function startBladeRotation(){
    isBladesSpinning = 1;
}
function stopBladeRotation(){
    isBladesSpinning = 0;
}


export { createPlane, startBladeRotation, stopBladeRotation, rotateBlades, isBladesSpinning };