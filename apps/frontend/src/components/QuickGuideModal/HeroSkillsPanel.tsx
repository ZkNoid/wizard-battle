'use client';

import { HeroSkillsBg } from './assets/hero-skills-bg';
import Image from 'next/image';

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
        <div className="flex items-center gap-2">
          {/* Left column - Skill icons grid (2x2) */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-1">
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Image
                  src="/game/skills/lightning.png"
                  alt="Lightning skill"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  quality={100}
                />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Image
                  src="/game/skills/teleport.png"
                  alt="Teleport skill"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  quality={100}
                />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Image
                  src="/game/skills/fireball.png"
                  alt="Fireball skill"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  quality={100}
                />
              </div>
              <div className="relative size-12 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Image
                  src="/game/skills/cross.png"
                  alt="Cross skill"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  quality={100}
                />
              </div>
            </div>
          </div>

          {/* Right column - Skill description panel */}
          <div className="flex flex-1 flex-col gap-1 rounded border border-gray-500 bg-gray-700/50 p-2">
            {/* Skill header */}
            <div className="flex items-center gap-2">
              <div className="relative size-8 flex-shrink-0 overflow-hidden rounded border border-gray-600 bg-gray-800">
                <Image
                  src="/game/skills/fireball.png"
                  alt="Fireball"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  quality={100}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-pixel text-main-gray text-sm font-bold">
                  Fireball
                </span>
                <span className="font-pixel-klein text-xs text-orange-500">
                  [Projectile] [Opponent]
                </span>
              </div>
            </div>

            {/* Skill description */}
            <p className="font-pixel-klein text-main-gray text-xs leading-tight">
              Deal 60 damage and 30/15 to surrounding tiles.
            </p>

            {/* Cooldown */}
            <div className="flex items-center gap-1">
              <Image
                src="/game/icons/cooldown.png"
                alt="Cooldown"
                width={16}
                height={16}
                className="size-4"
                unoptimized={true}
                quality={100}
              />
              <span className="font-pixel-klein text-main-gray text-xs">
                Cooldown: 2 turns
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
