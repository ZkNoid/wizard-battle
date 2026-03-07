'use client';

import { useEffect, useRef, useState } from 'react';
import {
  WIZARD_ANIMATIONS,
  HERO_BACKGROUND,
} from '@/lib/constants/wizardAnimations';
import { AnimatedHeroBg } from './assets/amimated-hero-bg';
import { computeDisplaySize, useSpriteAnimation } from './utils';

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

  const [bgDisplaySize, setBgDisplaySize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [heroDisplaySize, setHeroDisplaySize] = useState<{
    w: number;
    h: number;
  } | null>(null);

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
      <AnimatedHeroBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      {/* Background layer */}
      {bgDisplaySize && (
        <div
          ref={bgSpriteRef}
          className="absolute py-4"
          style={{
            backgroundImage: `url(${HERO_BACKGROUND.sheetUrl})`,
            backgroundSize: `${bgDisplaySize.w * HERO_BACKGROUND.frameCount}px ${bgDisplaySize.h}px`,
            backgroundPositionX: '0px',
            backgroundPositionY: '0px',
            backgroundRepeat: 'no-repeat',
            width: `${bgDisplaySize.w + 20}px`,
            height: `${bgDisplaySize.h - 10}px`,
            imageRendering: 'pixelated',
          }}
        />
      )}
      {/* Hero layer */}
      {heroData && heroDisplaySize && (
        <div
          ref={heroSpriteRef}
          className="absolute py-4"
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
