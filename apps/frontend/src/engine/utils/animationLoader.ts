import type { SpritesheetData, Animation } from '../types/animation';

// Cache for loaded spritesheets
const spritesheetCache = new Map<string, SpritesheetData>();
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Loads spritesheet data from JSON file
 */
export async function loadSpritesheet(path: string): Promise<SpritesheetData> {
  if (spritesheetCache.has(path)) {
    return spritesheetCache.get(path)!;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load spritesheet: ${response.statusText}`);
    }

    const data = (await response.json()) as SpritesheetData;
    spritesheetCache.set(path, data);
    return data;
  } catch (error) {
    console.error(`Error loading spritesheet from ${path}:`, error);
    throw error;
  }
}

/**
 * Loads spritesheet image
 */
export async function loadSpritesheetImage(
  imagePath: string
): Promise<HTMLImageElement> {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(imagePath, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };
    img.src = imagePath;
  });
}

/**
 * Creates animation from spritesheet data
 */
export function createAnimation(
  spritesheetData: SpritesheetData,
  animationName: string,
  loop = true
): Animation {
  const frames = Object.values(spritesheetData.frames);
  const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0);

  return {
    name: animationName,
    frames,
    loop,
    totalDuration,
  };
}

/**
 * Function for quick loading of animation
 */
export async function loadAnimation(
  jsonPath: string,
  imagePath: string,
  animationName: string,
  loop = true
): Promise<{ animation: Animation; image: HTMLImageElement }> {
  const [spritesheetData, image] = await Promise.all([
    loadSpritesheet(jsonPath),
    loadSpritesheetImage(imagePath),
  ]);

  const animation = createAnimation(spritesheetData, animationName, loop);

  return { animation, image };
}
