'use client';

import Image from 'next/image';
import type { IMarketSellingItem } from '@/lib/types/IMarket';
import { Button } from '../shared/Button';
import { BuyItemConfirmModalBg } from './assets/buy-item-confirm-modal-bg';

interface CancelSaleConfirmModalProps {
  item: IMarketSellingItem;
  onConfirm: (item: IMarketSellingItem) => void;
  onBack: () => void;
}

export function CancelSaleConfirmModal({
  item,
  onConfirm,
  onBack,
}: CancelSaleConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onBack}
    >
      <div
        className="relative"
        style={{ width: '300px', height: '430px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <BuyItemConfirmModalBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-5">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Cancel the sale
          </h2>

          {/* Warning text */}
          <p className="font-pixel-klein text-main-gray mt-3 text-center text-sm leading-relaxed">
            When you cancel the sale of an item, the gas spent on placing the
            item in the market is not refunded, are you sure you want to cancel
            the sale?
          </p>

          {/* Item image */}
          <div className="flex flex-1 items-center justify-center py-2">
            <Image
              src={`/items/${item.image}`}
              width={96}
              height={96}
              alt={item.title}
              className="h-20 w-20 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Item name + quantity */}
          <div className="flex w-full items-center justify-between">
            <span className="font-pixel text-main-gray text-sm font-bold">
              {item.title} LvL{item.level}
            </span>
            <span className="font-pixel text-main-gray/70 text-sm">
              x{item.quantity}
            </span>
          </div>

          {/* Price */}
          <div className="mt-1 flex w-full items-center justify-between">
            <span className="font-pixel text-main-gray text-sm font-bold">
              Price:
            </span>
            <div className="flex items-center gap-1">
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
              <span className="font-pixel text-main-gray text-sm font-bold">
                {item.price}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex w-full gap-2">
            <Button
              variant="gray"
              onClick={onBack}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-base font-bold">
                Back
              </span>
            </Button>
            <Button
              variant="red"
              onClick={() => onConfirm(item)}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-base font-bold text-white">
                Cancel
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
