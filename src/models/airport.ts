import * as THREE from 'three';
import { createHangar } from './hangar';
import { createTower } from './tower';
import type { HangarProps } from './hangar';
import type { TowerProps } from './tower.ts';

export type AirportProps = {
    airportLength : number,
    airportThickness : number,
    airportWidth : number,
    streetWidth : number
}
const airportDefaultProps : AirportProps = {
    airportLength : 250,
    airportThickness : 10,
    airportWidth : 100,
    streetWidth : 30

}
const hangarDefaultProps : HangarProps = {
    hangarLength : 20,
    hangarHeight : 10,

}
const towerDefaultProps : TowerProps = {
    towerHeight : 50,
    towerBaseSize : 10,
    towerTopSize : 20,
    pyramidHeight : 10
}

function createAirport( 
    {airportLength, airportThickness, airportWidth, streetWidth} = airportDefaultProps,
    {hangarLength, hangarHeight} = hangarDefaultProps,
    {towerHeight, towerBaseSize, towerTopSize, pyramidHeight} = towerDefaultProps
) : THREE.Mesh{

    const textureLoader = new THREE.TextureLoader();
    const streetTexture = textureLoader.load('textures/airport/long_street.jpg');
    streetTexture.wrapS = THREE.RepeatWrapping;
    streetTexture.wrapT = THREE.RepeatWrapping;
    streetTexture.repeat.set(1, 1);
    streetTexture.colorSpace = THREE.SRGBColorSpace;

    let airportGroup = new THREE.Group();
    const airportGeom = new THREE.BoxGeometry(airportLength, airportThickness, airportWidth);
    const airportMat = new THREE.MeshStandardMaterial( { color: 0x808080 } );
    const airport = new THREE.Mesh( airportGeom, airportMat );

    const streetGeom = new THREE.BoxGeometry(airportLength, airportThickness/2, streetWidth);
    const streetMat = new THREE.MeshStandardMaterial( { map: streetTexture } );
    const street = new THREE.Mesh( streetGeom, streetMat );
    street.position.y += airportThickness/2;
    street.position.z += airportWidth/4;

    const pillarHeight = 80;
    const pillarGeom = new THREE.BoxGeometry(airportThickness, pillarHeight, airportThickness);
    const pillarMat = new THREE.MeshStandardMaterial( { color: 0x606060 } );
    const pillar = new THREE.Mesh( pillarGeom, pillarMat );
    pillar.position.y -= (airportThickness/2 + pillarHeight/2);
    pillar.position.z += airportWidth/2 - airportThickness/2;
    pillar.position.x -= airportLength/2 - airportThickness/2;

    const midPillar = pillar.clone();
    midPillar.position.x += airportLength/2 - airportThickness;

    const otherPillar = pillar.clone();
    otherPillar.position.x += airportLength - airportThickness;


    airportGroup.add(airport, street, pillar, midPillar, otherPillar);
    const hangarWidth = hangarHeight;
    const hangarsOffset = -airportLength/2;
    let i=1
    for(i; i<7; i++){
        const hangar = createHangar(
            { hangarLength, hangarHeight }
        );
        
        hangar.position.set(
            hangarsOffset + i * (2.5*hangarWidth), 
            airportThickness/2, 
            -airportWidth/2 + 2*hangarWidth);
        airportGroup.add(hangar);
    }
    let towerPositionX = hangarsOffset + (i) * (hangarWidth * 2.5);

    const tower = createTower({ towerHeight, towerBaseSize, towerTopSize, pyramidHeight });
    tower.position.set(towerPositionX, airportThickness/2+towerHeight/2, -airportWidth/2 + 2*hangarWidth);
    airportGroup.add(tower);

    return airportGroup;
}

export { createAirport };