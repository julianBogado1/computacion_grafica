import * as THREE from 'three';

export type HangarProps = {
    hangarLength : number,
    hangarHeight : number
}

const hangarDefaultProps : HangarProps = {
    hangarLength : 200,
    hangarHeight : 50
}

function createHangar(
    { hangarLength, hangarHeight } = hangarDefaultProps
) : THREE.Mesh{
    const radius = hangarHeight;
    const textureLoader = new THREE.TextureLoader();
    const hangarTexture = textureLoader.load('textures/airport/metal_tank.webp');
    hangarTexture.wrapS = THREE.RepeatWrapping;
    hangarTexture.wrapT = THREE.RepeatWrapping;
    hangarTexture.repeat.set(1, 1);
    hangarTexture.colorSpace = THREE.SRGBColorSpace;

    const hangarGeom = new THREE.CylinderGeometry(
        radius,         // radiusTop
        radius,         // radiusBottom
        hangarLength,         // height
        64,             // radialSegments
        1,              // heightSegments
        false,          // openEnded
        0,              // thetaStart
        Math.PI         // thetaLength (half)
  );
    const hangarMat = new THREE.MeshStandardMaterial( { color: 0x77AA77 , map: hangarTexture } );
    const hangar = new THREE.Mesh( hangarGeom, hangarMat );
    hangar.rotation.y = Math.PI / 2;
    hangar.rotation.z = Math.PI / 2;

    return hangar;
}

export { createHangar, hangarDefaultProps };