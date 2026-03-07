'use client';

import { useEffect, useRef, useState } from 'react';
import { WIZARD_ANIMATIONS, HERO_BACKGROUND } from '@/lib/constants/wizardAnimations';
import type { SpriteAnimationData } from '@/lib/types/SpriteAnimationData';

function computeDisplaySize(
  containerEl: HTMLElement,
  animData: SpriteAnimationData
): { w: number; h: number } {
  const { width, height } = containerEl.getBoundingClientRect();
  const scale = Math.min(width / animData.frameWidth, height / animData.frameHeight);
  return {
    w: Math.round(animData.frameWidth * scale),
    h: Math.round(animData.frameHeight * scale),
  };
}

function useSpriteAnimation(
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

export function AnimatedHero({
  wizardId,
  className,
}: {
  wizardId: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgSpriteRef = useRef<HTMLDivElement>(null);
  const heroSpriteRef = useRef<HTMLDivElement>(null);

  const [bgDisplaySize, setBgDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [heroDisplaySize, setHeroDisplaySize] = useState<{ w: number; h: number } | null>(null);

  const heroData = WIZARD_ANIMATIONS[wizardId];

  useEffect(() => {
    setBgDisplaySize(null);
    setHeroDisplaySize(null);
    if (!containerRef.current) return;

    const el = containerRef.current;
    const measure = () => {
      setBgDisplaySize(computeDisplaySize(el, HERO_BACKGROUND));
      if (heroData) setHeroDisplaySize(computeDisplaySize(el, heroData));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [heroData]);

  useSpriteAnimation(bgSpriteRef, HERO_BACKGROUND, bgDisplaySize);
  useSpriteAnimation(heroSpriteRef, heroData, heroDisplaySize);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center${className ? ` ${className}` : ''}`}
    >
      {/* Background layer */}
      {bgDisplaySize && (
        <div
          ref={bgSpriteRef}
          className="absolute"
          style={{
            backgroundImage: `url(${HERO_BACKGROUND.sheetUrl})`,
            backgroundSize: `${bgDisplaySize.w * HERO_BACKGROUND.frameCount}px ${bgDisplaySize.h}px`,
            backgroundPositionX: '0px',
            backgroundPositionY: '0px',
            backgroundRepeat: 'no-repeat',
            width: `${bgDisplaySize.w}px`,
            height: `${bgDisplaySize.h}px`,
            imageRendering: 'pixelated',
          }}
        />
      )}
      {/* Hero layer */}
      {heroData && heroDisplaySize && (
        <div
          ref={heroSpriteRef}
          className="absolute"
          style={{
            backgroundImage: `url(${heroData.sheetUrl})`,
            backgroundSize: `${heroDisplaySize.w * heroData.frameCount}px ${heroDisplaySize.h}px`,
            backgroundPositionX: '0px',
            backgroundPositionY: '0px',
            backgroundRepeat: 'no-repeat',
            width: `${heroDisplaySize.w}px`,
            height: `${heroDisplaySize.h}px`,
            imageRendering: 'pixelated',
          }}
        />
      )}
    </div>
  );
}
