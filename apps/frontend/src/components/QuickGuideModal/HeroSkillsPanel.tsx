'use client';

import { HeroSkillsBg } from './assets/hero-skills-bg';

export default function HeroSkillsPanel() {
  return (
    <div className="relative w-full">
      <div className="relative z-10 px-6 py-4">
        {/* Content will be added here */}
      </div>
      <HeroSkillsBg className="absolute inset-0 -z-10 size-full" />
    </div>
  );
}
