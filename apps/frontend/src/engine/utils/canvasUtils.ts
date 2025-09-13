/**
 * Utility functions for optimizing Canvas rendering quality
 */

/**
 * Sets up canvas for high-quality pixel art rendering
 */
export function setupHighQualityCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  displayWidth: number,
  displayHeight: number,
  devicePixelRatio: number = window.devicePixelRatio || 1
): void {
  // Set the internal canvas size (backing store) scaled by device pixel ratio
  canvas.width = displayWidth * devicePixelRatio;
  canvas.height = displayHeight * devicePixelRatio;

  // Scale the canvas back down using CSS
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  // Scale the drawing context to handle the higher pixel density
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Configure rendering for pixel art
  ctx.imageSmoothingEnabled = false;

  // Additional quality settings
  if ('imageSmoothingQuality' in ctx) {
    (ctx as any).imageSmoothingQuality = 'high';
  }
}

/**
 * Calculates optimal scaling for maintaining aspect ratio
 */
export function calculateAspectRatioFit(
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number
): {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
} {
  const aspectRatio = sourceWidth / sourceHeight;

  let width = containerWidth;
  let height = containerHeight;
  let offsetX = 0;
  let offsetY = 0;

  // Maintain aspect ratio
  if (containerWidth / containerHeight > aspectRatio) {
    // Container is wider than image aspect ratio
    width = containerHeight * aspectRatio;
    offsetX = (containerWidth - width) / 2;
  } else {
    // Container is taller than image aspect ratio
    height = containerWidth / aspectRatio;
    offsetY = (containerHeight - height) / 2;
  }

  return { width, height, offsetX, offsetY };
}

/**
 * Optimizes image loading for pixel art
 */
export function optimizeImageForPixelArt(img: HTMLImageElement): void {
  img.style.imageRendering = 'pixelated';
  img.style.imageRendering = '-moz-crisp-edges';
  img.style.imageRendering = '-webkit-crisp-edges';
  img.style.imageRendering = 'crisp-edges';
}

/**
 * Detects if device has high DPI display
 */
export function isHighDPI(): boolean {
  return (window.devicePixelRatio || 1) > 1;
}

/**
 * Gets the current device pixel ratio
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}
