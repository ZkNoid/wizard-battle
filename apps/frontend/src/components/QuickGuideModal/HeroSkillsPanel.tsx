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
          {/* Left column - Skill icons grid (2x2) */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-1">
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Spell1 className="size-full" />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Spell2 className="size-full" />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Spell3 className="size-full" />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Spell4 className="size-full" />
              </div>
            </div>
          </div>

          <HeroSkillsDescription className="h-26 size-full" />
        </div>
      </div>
    </div>
  );
}
