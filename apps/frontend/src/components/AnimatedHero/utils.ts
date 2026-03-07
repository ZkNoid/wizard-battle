import type { SpriteAnimationData } from '@/lib/types/SpriteAnimationData';
import { useEffect, useRef } from 'react';

// AnimatedHeroBg SVG is 276×340, inner usable area is 256×320
const SVG_INNER_W_RATIO = 256 / 276;
const SVG_INNER_H_RATIO = 320 / 340;

export function computeDisplaySize(
  containerEl: HTMLElement,
  animData: SpriteAnimationData
): { w: number; h: number } {
  const { width, height } = containerEl.getBoundingClientRect();
  const availW = width * SVG_INNER_W_RATIO;
  const availH = height * SVG_INNER_H_RATIO;
  const scale = Math.min(
    availW / animData.frameWidth,
    availH / animData.frameHeight
  );
  return {
    w: Math.round(animData.frameWidth * scale),
    h: Math.round(animData.frameHeight * scale),
  };
}

export function useSpriteAnimation(
  spriteRef: React.RefObject<HTMLDivElement | null>,
  animData: SpriteAnimationData | undefined,
  displaySize: { w: number; h: number } | null
): void {
  const frameRef = useRef(0);

  useEffect(() => {
    if (!animData || !spriteRef.current || !displaySize) return;

    frameRef.current = 0;
    spriteRef.current.style.backgroundPositionX = '0px';

    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % animData.frameCount;
      if (spriteRef.current) {
        spriteRef.current.style.backgroundPositionX = `-${frameRef.current * displaySize.w}px`;
      }
    }, animData.frameDuration);

    return () => clearInterval(interval);
  }, [animData, displaySize, spriteRef]);
}
