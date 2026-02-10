'use client';

import { HeroActionPointBg } from './assets/hero-action-point-bg';
import Image from 'next/image';

export default function HeroActionPointsPanel() {
  return (
    <div className="h-38 relative w-full">
      <HeroActionPointBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-2 py-3">
        {/* Title */}
        <h3 className="font-pixel text-main-gray mb-2 text-xl font-bold">
          Hero action points
        </h3>

        {/* Content - 2 columns */}
        <div className="flex items-center gap-2">
          {/* Left column - Large action points icon */}
          <div className="flex-shrink-0">
            <Image
              src="/game/actions/action-points-menu.png"
              alt="Action points menu"
              width={96}
              height={96}
              className="size-24"
              unoptimized={true}
              quality={100}
            />
          </div>

          {/* Right column - Rows with descriptions */}
          <div className="flex flex-1 flex-col gap-1">
            {/* Row 1: Movement actions (2 columns) */}
            <div className="flex gap-4">
              <div className="flex flex-1 items-center gap-2">
                <Image
                  src="/game/actions/movement-point.png"
                  alt="Available movement point"
                  width={32}
                  height={32}
                  className="size-8"
                  unoptimized={true}
                  quality={100}
                />
                <span className="font-pixel-klein text-main-gray text-xs">
                  Available movement point
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Image
                  src="/game/actions/used-movement-point.png"
                  alt="Used movement point"
                  width={32}
                  height={32}
                  className="size-8"
                  unoptimized={true}
                  quality={100}
                />
                <span className="font-pixel-klein text-main-gray text-xs">
                  Used movement point
                </span>
              </div>
            </div>

            {/* Row 2: Skill actions (2 columns) */}
            <div className="flex gap-4">
              <div className="flex flex-1 items-center gap-2">
                <Image
                  src="/game/actions/skill-cast-point.png"
                  alt="Available skill cast point"
                  width={32}
                  height={32}
                  className="size-8"
                  unoptimized={true}
                  quality={100}
                />
                <span className="font-pixel-klein text-main-gray text-xs">
                  Available skill cast point
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Image
                  src="/game/actions/used-skill-cast-point.png"
                  alt="Used skill cast point"
                  width={32}
                  height={32}
                  className="size-8"
                  unoptimized={true}
                  quality={100}
                />
                <span className="font-pixel-klein text-main-gray text-xs">
                  Used skill cast point
                </span>
              </div>
            </div>

            {/* Row 3: Closed action point (1 column) */}
            <div className="flex items-center gap-2">
              <Image
                src="/game/actions/closed-action-point.png"
                alt="Closed action point"
                width={32}
                height={32}
                className="size-8"
                unoptimized={true}
                quality={100}
              />
              <span className="font-pixel-klein text-main-gray text-xs">
                Closed action point, will open during character levelling
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
