import Image from 'next/image';
import { BuyItemBg } from '../MarketModal/assets/buy-item-bg';
import type { IUserInventoryItem } from '@/lib/types/Inventory';

interface OfferPreviewProps {
  selectedUserItem: IUserInventoryItem | null;
  quantity: number;
  currency: string;
  totalPrice: number | null;
}

export function OfferPreview({
  selectedUserItem,
  quantity,
  currency,
  totalPrice,
}: OfferPreviewProps) {
  const currencyIcon =
    currency === 'gold' ? '/icons/gold-coin.png' : '/icons/usdс-coin.png';

  return (
    <div className="flex flex-col gap-2">
      <span className="font-pixel text-main-gray text-base font-bold">
        Your offer for sale
      </span>
      <div className="flex flex-row items-center gap-4">
        {/* Item image */}
        <div className="relative size-20 flex-shrink-0 p-3">
          {selectedUserItem ? (
            <Image
              src={`/items/${selectedUserItem.item.image}`}
              width={80}
              height={80}
              alt={selectedUserItem.item.title}
              quality={100}
              unoptimized
              className="size-full object-contain object-center"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <div className="size-8 bg-[#ACB0BC]/40" />
              <span className="font-pixel text-main-gray/50 text-[9px]">
                Resource
              </span>
            </div>
          )}
          <BuyItemBg className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1">
          <span className="font-pixel text-main-gray text-sm font-bold">
            {selectedUserItem?.item.title ?? 'Name of the item'}
          </span>
          <span className="font-pixel text-main-gray/70 text-xs">
            Quantity: {selectedUserItem ? quantity : 'X'}
          </span>
          <div className="flex items-center gap-1">
            <Image
              src={currencyIcon}
              width={14}
              height={14}
              alt={currency}
              className="h-3.5 w-3.5 object-contain"
              unoptimized
            />
            <span className="font-pixel text-main-gray text-sm font-bold">
              {totalPrice ?? '0000'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
