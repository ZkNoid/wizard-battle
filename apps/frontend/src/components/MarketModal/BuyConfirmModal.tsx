'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { IMarketBuyItem } from '@/lib/types/IMarket';
import { Button } from '../shared/Button';
import { BuyItemConfirmModalBg } from './assets/buy-item-confirm-modal-bg';
import { QuantitySelector } from '../shared/QuantitySelector';

interface BuyConfirmModalProps {
  item: IMarketBuyItem;
  onConfirm: (item: IMarketBuyItem, quantity: number) => void;
  onCancel: () => void;
}

export function BuyConfirmModal({
  item,
  onConfirm,
  onCancel,
}: BuyConfirmModalProps) {
  const [qty, setQty] = useState(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="h-90 relative w-80" onClick={(e) => e.stopPropagation()}>
        <BuyItemConfirmModalBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-4">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Buy Item
          </h2>

          {/* Item image */}
          <div className="flex flex-1 items-center justify-center py-1">
            <Image
              src={`/items/${item.image}`}
              width={96}
              height={96}
              alt={item.title}
              className="h-20 w-20 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Quantity selector */}
          <QuantitySelector
            value={qty}
            onChange={setQty}
            min={1}
            max={item.quantity}
          />

          {/* Item name + quantity */}
          <div className="mt-2 flex w-full items-center justify-between">
            <span className="font-pixel text-main-gray text-sm font-bold">
              {item.title} LvL{item.level}
            </span>
            <span className="font-pixel text-main-gray/70 text-sm">x{qty}</span>
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
                {item.price * qty}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex w-full gap-2">
            <Button
              variant="red"
              onClick={onCancel}
              className="h-10 flex-1 text-sm"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-base font-bold text-white">
                Cancel
              </span>
            </Button>
            <Button
              variant="green"
              onClick={() => onConfirm(item, qty)}
              className="h-10 flex-1 text-sm"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-base font-bold">
                Buy
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
