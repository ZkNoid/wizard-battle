'use client';

import { HeroCharacteristicsBg } from './assets/hero-characteristics-bg';
import Image from 'next/image';

export default function HeroCharacteristicsPanel() {
  return (
    <div className="h-35 relative w-full">
      <HeroCharacteristicsBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-5 py-3">
        {/* Title */}
        <h3 className="font-pixel text-main-gray text-xl font-bold">
          Hero characteristics
        </h3>

        {/* Content */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative size-24 flex-shrink-0">
            <Image
              src="/inventory/carousel/mage.png"
              alt="Character avatar"
              width={96}
              height={96}
              className="h-full w-full object-contain"
              unoptimized={true}
              quality={100}
            />
          </div>

          {/* Character Info */}
          <div className="flex flex-1 flex-col gap-2">
            {/* Class Icon & Nickname */}
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center bg-[#D5D8DD]">
                <Image
                  src="/icons/gem.png"
                  alt="Class icon"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  unoptimized={true}
                  quality={100}
                />
              </div>
              <div className="font-pixel flex h-10 flex-1 items-center bg-[#D5D8DD] px-3 text-base text-black">
                Alex Ivlev
              </div>
            </div>

            {/* Health Bar */}
            <div className="relative h-6 w-full overflow-hidden bg-[#D5D8DD]">
              <div
                className="absolute inset-y-0 left-0 bg-[#DC143C]"
                style={{ width: '85%' }}
              />
            </div>

            {/* Level Bar */}
            <div className="relative h-6 w-fit overflow-hidden bg-[#D5D8DD] px-3">
              <span className="font-pixel relative z-10 text-sm font-bold text-white">
                Lvl. 98
              </span>
              <div
                className="absolute inset-0 bg-[#006D00]"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
