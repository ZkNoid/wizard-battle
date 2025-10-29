import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/Tooltip';
import type { ReactNode } from 'react';
import type { IInventoryItem } from '@/lib/types/Inventory';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function InventoryTooltip({
  item,
  children,
}: {
  item: IInventoryItem;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex min-w-80 flex-col gap-1 p-4">
        <div className="flex flex-row gap-2.5">
          <Image
            src={`/items/${item.image}`}
            alt={item.title}
            width={100}
            height={100}
            className="size-10 object-contain object-center"
            unoptimized={true}
            quality={100}
          />
          <div className="flex flex-col gap-1">
            <span className="font-pixel text-main-gray text-lg font-bold">
              {item.title}
            </span>
            <span
              className={cn(
                'font-pixel text-main-gray text-sm',
                item.rarity === 'common'
                  ? 'text-[#00AF06]'
                  : item.rarity === 'uncommon'
                    ? 'text-[#0035B7]'
                    : 'text-[#5E00E1]'
              )}
            >
              [{item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}]
            </span>
          </div>
        </div>
        <span className="font-pixel text-main-gray mt-2 text-sm">
          {item.description}
        </span>
        <div className="my-2 h-px w-full bg-black" />
        <div className="flex w-full flex-row items-center justify-between">
          <span className="font-pixel text-main-gray text-sm">
            Quantity {item.amount}
          </span>
          <div className="flex flex-row items-center gap-1">
            <span className="font-pixel text-main-gray text-base font-bold">
              {item.price}
            </span>
            <Image
              src="/icons/gold-coin.png"
              width={16}
              height={16}
              alt="gold-coin"
              className="size-4 object-contain object-center"
            />
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
