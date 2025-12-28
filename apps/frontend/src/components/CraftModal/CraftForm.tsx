'use client';

import Image from 'next/image';
import { CollapsePanel } from '../shared/CollapsePanel';
import { CraftFormBg } from './assets/craft-form-bg';
import { CRAFT_GROUP_PANELS } from '@/lib/constants/craft';

export function CraftForm() {
  return (
    <div className="relative flex min-h-[600px] flex-col px-5">
      {/* Background */}
      <CraftFormBg className="absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content */}
      <div className="absolute z-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-row items-center gap-2.5">
          <Image
            src="/icons/armor.png"
            width={32}
            height={28}
            alt="armor"
            className="h-7 w-8 object-contain object-center"
          />
          <span className="font-pixel text-main-gray text-lg font-bold">
            Armor
          </span>
        </div>

        {/* Content will go here */}
        <div className="text-main-gray font-pixel flex flex-col gap-2.5">
          {/* TODO: Add craft content */}
          {CRAFT_GROUP_PANELS.map((panel) => (
            <CollapsePanel
              title={
                <span className="flex flex-row items-center gap-2.5">
                  <Image
                    src={panel.icon}
                    alt={panel.title}
                    width={32}
                    height={32}
                  />
                  {panel.title}
                </span>
              }
              children={
                panel.items && panel.items.length > 0 ? (
                  <div className="flex flex-row gap-2.5">
                    {panel.items.map((item) => (
                      <div className="flex flex-col gap-1">Content</div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-row gap-2.5">
                    <div className="flex flex-col gap-1">No items</div>
                  </div>
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
