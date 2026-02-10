'use client';

import { HeroSkillsBg } from './assets/hero-skills-bg';
import Image from 'next/image';
import { Spell1 } from './assets/spell-1';
import { Spell2 } from './assets/spell-2';
import { Spell3 } from './assets/spell-3';
import { Spell4 } from './assets/spell-4';
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
        <div className="flex items-start justify-start gap-2">
          <HeroSkillsDescription className="h-26 size-full w-60" />
        </div>
      </div>
    </div>
  );
}
