import * as THREE from 'three';
import { parseGIF, decompressFrames } from 'gifuct-js';

export interface Explosion {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  frameIndex: number; // which frame is currently showing
  frameTimer: number; // seconds elapsed since last frame change
}

interface GifFrame {
  texture: THREE.CanvasTexture;
  delay: number; // seconds this frame should be shown
}

const EXPLOSION_SIZE = 80;
const GIF_PATH       = 'effects/explosion.gif';

// Frames are loaded once and shared across all explosions
let gifFrames: GifFrame[] = [];

/**
 * Load every frame of the explosion GIF into its own canvas texture, and store them in `gifFrames`.
 */
export async function loadExplosionGif(): Promise<void> {
  const response = await fetch(GIF_PATH);
  const buffer   = await response.arrayBuffer();
  const gif      = parseGIF(buffer);
  const frames   = decompressFrames(gif, true); // true = composite each frame on top of previous

  // Build a persistent canvas to accumulate composited frames (required for GIF disposal)
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width  = gif.lsd.width;
  compositeCanvas.height = gif.lsd.height;
  const compositeCtx = compositeCanvas.getContext('2d')!;

  gifFrames = frames.map(frame => {
    // Draw this frame's patch onto the composite canvas at the frame's offset
    const frameImageData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height,
    );
    compositeCtx.putImageData(frameImageData, frame.dims.left, frame.dims.top);

    // Snapshot the full composite into its own canvas → texture
    const snapshot = document.createElement('canvas');
    snapshot.width  = compositeCanvas.width;
    snapshot.height = compositeCanvas.height;
    snapshot.getContext('2d')!.drawImage(compositeCanvas, 0, 0);

    return {
      texture: new THREE.CanvasTexture(snapshot),
      delay: (frame.delay / 100) * 0.25, // GIF delay is in centiseconds → convert to seconds
    };
  });
}

export function createExplosion(position: THREE.Vector3): Explosion | null {
  if (gifFrames.length === 0) {
    console.warn('Explosion GIF not loaded yet');
    return null;
  }

  const material = new THREE.SpriteMaterial({
    map: gifFrames[0].texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(EXPLOSION_SIZE, EXPLOSION_SIZE, 1);

  return { sprite, material, frameIndex: 0, frameTimer: 0 };
}

// Advances to the next frame when enough time has passed; returns true when the animation is done
export function updateExplosion(e: Explosion, dt: number): boolean {
  e.frameTimer += dt;

  if (e.frameTimer >= gifFrames[e.frameIndex].delay) {
    e.frameTimer -= gifFrames[e.frameIndex].delay;
    e.frameIndex++;

    if (e.frameIndex >= gifFrames.length) return true; // animation finished

    e.material.map = gifFrames[e.frameIndex].texture;
    e.material.needsUpdate = true;
  }
  return false;
}
