import * as THREE from 'three';

export function ElevationGeometry(
  width: number,
  height: number,
  amplitude: number,
  widthSegments: number,
  heightSegments: number,
  texture: THREE.Texture,
): THREE.BufferGeometry | null {
  const geometry  = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices:   number[] = [];
  const normals:   number[] = [];
  const uvs:       number[] = [];

  // Read pixel values from the texture via an offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  const img    = texture.image;

  // Scale canvas to match segment resolution, with a small blur to smooth normals
  canvas.width  = widthSegments;
  canvas.height = heightSegments;

  if (!ctx) {
    console.error('Could not get canvas 2D context');
    return null;
  }

  ctx.filter = 'blur(2px)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData    = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data         = imageData.data;
  const quadsPerRow  = widthSegments - 1;

  for (let i = 0; i < canvas.width - 1; i++) {
    for (let j = 0; j < canvas.height - 1; j++) {
      const z0 = data[(i + j * widthSegments) * 4] / 255;

      // Sample adjacent pixels for finite-difference normal estimation
      const xPrev = i > 0              ? data[(i - 1 + j * widthSegments) * 4] / 255       : undefined;
      const xNext = i < widthSegments - 1  ? data[(i + 1 + j * widthSegments) * 4] / 255  : undefined;
      const yPrev = j > 0              ? data[(i + (j - 1) * widthSegments) * 4] / 255     : undefined;
      const yNext = j < heightSegments - 1 ? data[(i + (j + 1) * widthSegments) * 4] / 255 : undefined;

      if (i > 0 && xPrev == undefined || i < widthSegments - 1 && xNext == undefined ||
          j > 0 && yPrev == undefined || j < heightSegments - 1 && yNext == undefined) {
        console.error('Undefined adjacent pixel value');
        return null;
      }

      let deltaX: number;
      if (xPrev == undefined) {
        deltaX = xNext - z0;
      } else if (xNext == undefined) {
        deltaX = xPrev - z0;
      } else {
        deltaX = (xNext - xPrev) / 2;
      }

      let deltaY: number;
      if (yPrev == undefined) {
        deltaY = yNext - z0;
      } else if (yNext == undefined) {
        deltaY = yPrev - z0;
      } else {
        deltaY = (yNext - yPrev) / 2;
      }

      const z = amplitude * z0;

      positions.push((width * i) / widthSegments - width / 2);
      positions.push(z);
      positions.push((height * j) / heightSegments - height / 2);

      const tanX = new THREE.Vector3(width / widthSegments, deltaX * amplitude, 0).normalize();
      const tanY = new THREE.Vector3(0, deltaY * amplitude, height / heightSegments).normalize();
      const n    = new THREE.Vector3();
      n.crossVectors(tanY, tanX);

      normals.push(n.x, n.y, n.z);
      uvs.push(i / (widthSegments - 1), j / (heightSegments - 1));

      if (i == widthSegments - 2 || j == heightSegments - 2) continue;

      // Assemble triangles
      indices.push(i + j * quadsPerRow);
      indices.push(i + 1 + j * quadsPerRow);
      indices.push(i + 1 + (j + 1) * quadsPerRow);

      indices.push(i + j * quadsPerRow);
      indices.push(i + 1 + (j + 1) * quadsPerRow);
      indices.push(i + (j + 1) * quadsPerRow);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}
