'use client';

import { HeroSkillsBg } from './assets/hero-skills-bg';
import { HeroSkillsDescription } from './assets/hero-skills-description';

export default function HeroSkillsPanel() {
  return (
    <div className="h-38 relative w-full">
      <HeroSkillsBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-5 py-3">
        {/* Title */}
        <h3 className="font-pixel text-main-gray mb-0 text-xl font-bold">
          Hero skills
        </h3>

        {/* Content - 2 columns */}
        <HeroSkillsDescription className="h-22 w-full" />
      </div>
    </div>
  );
}
