import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/Tooltip';
import type { ReactNode } from 'react';
import type { IUserInventoryItem } from '@/lib/types/Inventory';
import { isArmorItem } from '@/lib/types/Inventory';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const BUFF_LABELS: Record<string, string> = {
  critChance: 'Crit. Chance',
  Accuracy: 'Accuracy',
  Attack: 'Attack',
  Dodge: 'Dodge',
  Movement: 'Movement',
  Defence: 'Defence',
};

const CLASS_LABELS: Record<string, string> = {
  ShadowArcher: 'Shadow Archer',
  PhantomDuelist: 'Phantom Duelist',
  ArcaneSorcerer: 'Arcane Sorcerer',
};

export function InventoryTooltip({
  userItem,
  children,
}: {
  userItem: IUserInventoryItem;
  children: ReactNode;
}) {
  const item = userItem.item;
  const isArmor = isArmorItem(item);

  // Get buffs as array of [key, value] pairs
  const buffs = isArmor && item.buff
    ? Object.entries(item.buff).filter(([_, value]) => value !== undefined && value !== '')
    : [];

  // Get wear requirements
  const wearRequirements = isArmor ? item.wearRequirements : [];

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="w-72 bg-gray-300 border-[5px] border-slate-500 p-0">
        <div className="relative p-3">
          {/* Header with icon and title */}
          <div className="flex flex-row gap-2.5">
            <div className="w-8 h-8 relative flex-shrink-0">
              <div className="w-6 h-6 absolute left-[3px] top-[3px] bg-gray-800" />
              <Image
                src={`/items/${item.image}`}
                alt={item.title}
                width={32}
                height={32}
                className="size-8 object-contain object-center relative z-10"
                unoptimized={true}
                quality={100}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-['DePixel'] text-slate-950 text-xs font-bold">
                {item.title}
              </span>
              <span
                className={cn(
                  "font-['DePixel'] text-[9px] font-bold",
                  item.rarity === 'common'
                    ? 'text-lime-600'
                    : item.rarity === 'uncommon'
                      ? 'text-blue-500'
                      : 'text-purple-600'
                )}
              >
                [{item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}]
              </span>
            </div>
          </div>

          {/* Buffs section - only for armor type */}
          {isArmor && buffs.length > 0 && (
            <div className="mt-3">
              <div className="font-['DePixel'] text-blue-500 text-xs font-normal">
                Buffs:
              </div>
              <div className="mt-1.5 space-y-1">
                {buffs.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 overflow-hidden flex-shrink-0">
                      <div className="w-3 h-3 bg-emerald-700 rounded-sm" />
                    </div>
                    <span className="font-['DePixel'] text-xs">
                      <span className="text-slate-950 font-normal">
                        {BUFF_LABELS[key] || key}:{' '}
                      </span>
                      <span className="text-lime-600 font-bold">
                        +{value}{key !== 'Movement' ? '%' : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wear Requirements section - only for armor type */}
          {isArmor && wearRequirements.length > 0 && (
            <div className="mt-3">
              <div className="font-['DePixel'] text-blue-500 text-xs font-normal">
                Wear requirements:
              </div>
              <div className="mt-1.5 space-y-1">
                {wearRequirements.map((req, idx) => (
                  <div key={idx} className="font-['DePixel'] text-xs">
                    <span className="text-slate-950 font-normal">
                      {req.requirement === 'class' ? 'Character class' : 'Character level'}:{' '}
                    </span>
                    <span className="text-lime-600 font-bold">
                      [{req.requirement === 'class' 
                        ? (CLASS_LABELS[String(req.value)] || req.value)
                        : req.value}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description - only for non-armor items */}
          {!isArmor && (
            <div className="mt-3">
              <span className="font-['DePixel'] text-slate-950 text-[10px]">
                {item.description}
              </span>
            </div>
          )}

          {/* Footer with quantity and price - only for non-armor items */}
          {!isArmor && (
            <div className="mt-3 pt-2 border-t border-slate-500 flex w-full flex-row items-center justify-between">
              <span className="font-['DePixel'] text-slate-950 text-xs">
                Qty: {userItem.quantity}
              </span>
              <div className="flex flex-row items-center gap-1">
                <span className="font-['DePixel'] text-amber-600 text-xs font-bold">
                  {item.price}
                </span>
                <Image
                  src="/icons/gold-coin.png"
                  width={14}
                  height={14}
                  alt="gold-coin"
                  className="size-3.5 object-contain object-center"
                />
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
