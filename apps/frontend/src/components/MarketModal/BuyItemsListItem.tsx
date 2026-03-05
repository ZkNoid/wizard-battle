import Image from 'next/image';
import type { IMarketBuyItem } from '@/lib/types/IMarket';
import { BuyItemBg } from './assets/buy-item-bg';
import { Button } from '../shared/Button';
import { InventoryTooltip } from '../InventoryModal/InventoryTooltip';

interface BuyItemsListItemProps {
  item: IMarketBuyItem;
  canAfford?: boolean;
  onClick?: (item: IMarketBuyItem) => void;
}

export function BuyItemsListItem({
  item,
  canAfford = true,
  onClick,
}: BuyItemsListItemProps) {
  return (
    <div className="relative flex h-full min-h-40 w-full flex-col gap-0 p-4 pb-3">
      <BuyItemBg className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Top: info + image */}
      <div className="relative z-10 flex flex-1 flex-row items-start justify-between gap-2">
        {/* Left: title, quantity, price */}
        <div className="flex h-full flex-1 flex-col">
          <span className="font-pixel text-main-gray text-sm font-bold leading-tight">
            {item.title} Lv{item.level}
          </span>
          <span className="font-pixel-klein text-main-gray/70 mt-1 text-sm">
            Quantity: {item.quantity}
          </span>
          <div className="mt-auto flex items-center gap-1 pt-3">
            <Image
              src={
                item.priceCurrency === 'gold'
                  ? '/icons/gold-coin.png'
                  : '/icons/usdс-coin.png'
              }
              width={16}
              height={16}
              alt={item.priceCurrency}
              className="h-4 w-4 object-contain"
              unoptimized
            />
            <span
              className={`font-pixel-klein text-sm font-bold ${canAfford ? 'text-main-gray' : 'text-red-500'}`}
            >
              {item.price}
            </span>
          </div>
        </div>

        {/* Right: item image */}
        {item.tooltipItem ? (
          <InventoryTooltip
            userItem={{ item: item.tooltipItem, quantity: item.quantity }}
          >
            <Image
              src={`/items/${item.image}`}
              width={64}
              height={64}
              alt={item.title}
              className="h-20 w-20 flex-shrink-0 cursor-pointer object-contain object-center"
              unoptimized
            />
          </InventoryTooltip>
        ) : (
          <Image
            src={`/items/${item.image}`}
            width={64}
            height={64}
            alt={item.title}
            className="h-20 w-20 flex-shrink-0 object-contain object-center"
            unoptimized
          />
        )}
      </div>

      {/* Bottom: Buy button */}
      <div className="relative z-10 mt-2">
        <Button
          variant="gray"
          className="h-10 w-full"
          onClick={() => onClick?.(item)}
          enableHoverSound
          enableClickSound
        >
          <span className="font-pixel-klein text-main-gray text-base font-bold">
            Buy
          </span>
        </Button>
      </div>
    </div>
  );
}
