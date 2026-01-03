'use client';

import Image from 'next/image';
import { CollapsePanel } from '../shared/CollapsePanel';
import { CraftFormBg } from './assets/craft-form-bg';
import { CRAFT_GROUP_PANELS } from '@/lib/constants/craft';
import { CraftFormItem } from './CraftFormItem';
import { Scroll } from '../shared/Scroll';

export function CraftForm() {
  return (
    <div className="relative flex h-full flex-col">
      {/* Background */}
      <CraftFormBg className="absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col gap-5">
        {/* Scrollable Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <Scroll height="100%" className="w-full" alwaysShowScrollbar={true}>
            <div className="flex flex-shrink-0 flex-row items-center gap-2.5">
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
            <div className="flex flex-col gap-2.5">
              {CRAFT_GROUP_PANELS.map((panel) => (
                <CollapsePanel
                  key={panel.title}
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
                      <div className="flex flex-row">
                        {panel.items.map((item) => (
                          <CraftFormItem key={item.id} item={item} />
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
          </Scroll>
        </div>
      </div>
    </div>
  );
}
