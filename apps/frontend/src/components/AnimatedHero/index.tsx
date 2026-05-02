'use client';

import { useEffect, useRef, useState } from 'react';
import {
  WIZARD_ANIMATIONS,
  HERO_BACKGROUND,
} from '@/lib/constants/wizardAnimations';
import { AnimatedHeroBg } from './assets/amimated-hero-bg';
import { computeDisplaySize, useSpriteAnimation } from './utils';
import Image from 'next/image';

export function AnimatedHero({
  wizardId,
  className,
}: {
  wizardId: string;
  className?: string;
}) {
  // innerRef measures the usable area inside the SVG frame border.
  // CSS positions it via percentage insets that match the SVG viewBox border:
  // horizontal: 10/276 ≈ 3.62% per side, vertical: 10/340 ≈ 2.94% per side.
  const innerRef = useRef<HTMLDivElement>(null);
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
    if (!innerRef.current) return;

    const el = innerRef.current;
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
      className={`relative flex h-full w-full items-center justify-center${className ? ` ${className}` : ''}`}
    >
      <AnimatedHeroBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      {/* Inner area matching SVG frame interior, sized via CSS percentage insets */}
      <div
        ref={innerRef}
        className="absolute inset-x-[3.62%] inset-y-[2.94%] flex items-center justify-center overflow-hidden"
      >
        {/* Background layer */}
        {bgDisplaySize && (
          <>
            <Image
              src="/animations/heroes/static-backbround.png"
              alt=""
              width={bgDisplaySize.w + 25}
              height={bgDisplaySize.h - 20}
              className="object-cover"
              style={{ imageRendering: 'pixelated' }}
              unoptimized
            />
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
          </>
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
    </div>
  );
}
