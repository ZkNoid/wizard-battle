'use client';

import { HeroCharacteristicsBg } from './assets/hero-characteristics-bg';

export default function HeroCharacteristicsPanel() {
  return (
    <div className="relative w-full">
      <div className="relative z-10 px-6 py-4">
        {/* Content will be added here */}
      </div>
      <HeroCharacteristicsBg className="absolute inset-0 -z-10 size-full" />
    </div>
  );
}
