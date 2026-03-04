import Image from 'next/image';
import type { IMarketBuyItem } from '@/lib/types/IMarket';
import { BuyItemBg } from './assets/buy-item-bg';

interface BuyItemsListItemProps {
  item: IMarketBuyItem;
  onClick?: (item: IMarketBuyItem) => void;
}

export function BuyItemsListItem({ item, onClick }: BuyItemsListItemProps) {
  return (
    <div
      onClick={() => onClick?.(item)}
      className="group relative flex w-full flex-col items-center gap-1 px-3 py-2 transition-opacity hover:opacity-80"
    >
      <BuyItemBg className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Image */}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center">
        <Image
          src={`/items/${item.image}`}
          width={64}
          height={64}
          alt={item.title}
          className="h-full w-full object-contain object-center"
          unoptimized
        />
      </div>

      {/* Title */}
      <span className="font-pixel-klein text-main-gray relative z-10 w-full text-center text-xs leading-tight">
        {item.title}
      </span>

      {/* Level & quantity */}
      <div className="font-pixel-klein text-main-gray/60 relative z-10 flex w-full items-center justify-between px-1 text-xs">
        <span>Lv.{item.level}</span>
        <span>x{item.quantity}</span>
      </div>

      {/* Price */}
      <div className="font-pixel-klein text-main-gray relative z-10 flex w-full items-center justify-center gap-1 text-xs">
        <span>{item.price}</span>
        <span className="uppercase opacity-60">{item.priceCurrency}</span>
      </div>
    </div>
  );
}
