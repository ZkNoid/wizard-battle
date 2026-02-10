'use client';

import { HeroCharacteristicsBg } from './assets/hero-characteristics-bg';
import Image from 'next/image';
import { HeroCharacteristicsDescription } from './assets/hero-characteristics-description';

export default function HeroCharacteristicsPanel() {
  return (
    <div className="h-35 relative w-full">
      <HeroCharacteristicsBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-5 py-3">
        {/* Title */}
        <h3 className="font-pixel text-main-gray text-xl font-bold">
          Hero characteristics
        </h3>

        <HeroCharacteristicsDescription className="h-26 size-full w-60" />
      </div>
    </div>
  );
}
