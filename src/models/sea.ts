import * as THREE from 'three';

const SEA_LEVEL = 15;

function createSea() : THREE.Mesh{

    const textureLoader = new THREE.TextureLoader();
    const seaTexture = textureLoader.load('textures/sea/sea.jpg');
    seaTexture.wrapS = THREE.RepeatWrapping;
    seaTexture.wrapT = THREE.RepeatWrapping;
    seaTexture.repeat.set(20, 20);

    let waterGeom = new THREE.PlaneGeometry(10000, 10000, 100, 100);
    let waterMat = new THREE.MeshStandardMaterial( {
        map: seaTexture,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
    } );
    const water = new THREE.Mesh( waterGeom, waterMat );
    water.rotateX(-Math.PI / 2);
    return water;
}

export { createSea, SEA_LEVEL };