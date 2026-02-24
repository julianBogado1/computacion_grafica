import * as THREE from 'three';
import { createHangar } from './hangar';
import { createTower } from './tower';
import type { HangarProps } from './hangar';
import type { TowerProps } from './tower';

export type AirportProps = {
  airportLength: number;
  airportThickness: number;
  airportWidth: number;
  streetWidth: number;
};

const airportDefaultProps: AirportProps = {
  airportLength: 250,
  airportThickness: 10,
  airportWidth: 100,
  streetWidth: 30,
};

const hangarDefaultProps: HangarProps = {
  hangarLength: 20,
  hangarHeight: 10,
};

const towerDefaultProps: TowerProps = {
  towerHeight: 50,
  towerBaseSize: 10,
  towerTopSize: 20,
  pyramidHeight: 10,
};

export function createAirport(
  { airportLength, airportThickness, airportWidth, streetWidth } = airportDefaultProps,
  { hangarLength, hangarHeight } = hangarDefaultProps,
  { towerHeight, towerBaseSize, towerTopSize, pyramidHeight } = towerDefaultProps,
): THREE.Group {
  const streetTexture = new THREE.TextureLoader().load('textures/airport/long_street.jpg');
  streetTexture.wrapS = THREE.RepeatWrapping;
  streetTexture.wrapT = THREE.RepeatWrapping;
  streetTexture.repeat.set(1, 1);
  streetTexture.colorSpace = THREE.SRGBColorSpace;

  const airportGroup = new THREE.Group();

  const airport = new THREE.Mesh(
    new THREE.BoxGeometry(airportLength, airportThickness, airportWidth),
    new THREE.MeshStandardMaterial({ color: 0x808080 }),
  );

  const street = new THREE.Mesh(
    new THREE.BoxGeometry(airportLength, airportThickness / 2, streetWidth),
    new THREE.MeshStandardMaterial({ map: streetTexture }),
  );
  street.position.y += airportThickness / 2;
  street.position.z += airportWidth / 4;

  const pillarHeight = 80;
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(airportThickness, pillarHeight, airportThickness),
    new THREE.MeshStandardMaterial({ color: 0x606060 }),
  );
  pillar.position.y -= airportThickness / 2 + pillarHeight / 2;
  pillar.position.z += airportWidth / 2 - airportThickness / 2;
  pillar.position.x -= airportLength / 2 - airportThickness / 2;

  const midPillar = pillar.clone();
  midPillar.position.x += airportLength / 2 - airportThickness;

  const otherPillar = pillar.clone();
  otherPillar.position.x += airportLength - airportThickness;

  airportGroup.add(airport, street, pillar, midPillar, otherPillar);

  // Hangars
  const hangarWidth   = hangarHeight;
  const hangarsOffset = -airportLength / 2;
  for (let i = 1; i < 7; i++) {
    const hangar = createHangar({ hangarLength, hangarHeight });
    hangar.position.set(
      hangarsOffset + i * (2.5 * hangarWidth),
      airportThickness / 2,
      -airportWidth / 2 + 2 * hangarWidth,
    );
    airportGroup.add(hangar);
  }

  // Tower (placed after the last hangar; i ends at 7 after the loop)
  const towerPositionX = hangarsOffset + 7 * (hangarWidth * 2.5);
  const tower = createTower({ towerHeight, towerBaseSize, towerTopSize, pyramidHeight });
  tower.position.set(
    towerPositionX,
    airportThickness / 2 + towerHeight / 2,
    -airportWidth / 2 + 2 * hangarWidth,
  );
  airportGroup.add(tower);

  return airportGroup;
}
