'use client';

import { HeroActionPointBg } from './assets/hero-action-point-bg';

export default function HeroActionPointsPanel() {
  return (
    <div className="relative w-full">
      <div className="relative z-10 px-6 py-4">
        {/* Content will be added here */}
      </div>
      <HeroActionPointBg className="absolute inset-0 -z-10 size-full" />
    </div>
  );
}
