import Image from 'next/image';
import { ItemSlot } from '../shared/ItemSlot';
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
        <ItemSlot
          item={selectedUserItem?.item ?? null}
          label={selectedUserItem ? undefined : 'Resource'}
        />

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
