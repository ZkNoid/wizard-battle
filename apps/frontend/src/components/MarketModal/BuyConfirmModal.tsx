'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { IMarketBuyItem } from '@/lib/types/IMarket';
import { Button } from '../shared/Button';
import { BuyItemConfirmModalBg } from './assets/buy-item-confirm-modal-bg';
import BoxButton from '../shared/BoxButton';

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

  const increment = () => setQty((q) => Math.min(item.quantity, q + 1));
  const decrement = () => setQty((q) => Math.max(1, q - 1));
  const setAll = () => setQty(item.quantity);
  const setOne = () => setQty(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="relative"
        style={{ width: '277px', height: '297px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <BuyItemConfirmModalBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-4">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Buy Item
          </h2>

          {/* Item image */}
          <div className="flex flex-1 items-center justify-center py-2">
            <Image
              src={`/items/${item.image}`}
              width={96}
              height={96}
              alt={item.title}
              className="h-24 w-24 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Quantity selector */}
          <div className="flex w-full items-center justify-between gap-1.5">
            <BoxButton
              onClick={setOne}
              color="gray"
              className="h-9 w-9 shrink-0"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-xs font-bold">
                1
              </span>
            </BoxButton>

            <BoxButton
              onClick={increment}
              color="gray"
              className="h-9 w-9 shrink-0"
              disabled={qty >= item.quantity}
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-sm font-bold">
                +
              </span>
            </BoxButton>

            {/* Quantity display */}
            <div className="relative flex flex-1 items-center justify-center">
              <BuyConfirmQtyBg className="absolute inset-0 h-full w-full" />
              <span className="font-pixel text-main-gray relative z-10 text-sm font-bold">
                {qty}
              </span>
            </div>

            <BoxButton
              onClick={decrement}
              color="gray"
              className="h-9 w-9 shrink-0"
              disabled={qty <= 1}
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-sm font-bold">
                -
              </span>
            </BoxButton>

            <BoxButton
              onClick={setAll}
              color="gray"
              className="h-9 w-9 shrink-0"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-gray text-xs font-bold">
                All
              </span>
            </BoxButton>
          </div>

          {/* Item name + quantity */}
          <div className="mt-3 flex w-full items-center justify-between">
            <span className="font-pixel text-main-gray text-sm font-bold">
              {item.title} LvL{item.level}
            </span>
            <span className="font-pixel text-main-gray/70 text-sm">
              x{qty}
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
                {item.price * qty}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex w-full gap-2">
            <Button
              variant="red"
              onClick={onCancel}
              className="h-12 flex-1 text-sm"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-white text-base font-bold">
                Cancel
              </span>
            </Button>
            <Button
              variant="gray"
              onClick={() => onConfirm(item, qty)}
              className="h-12 flex-1 text-sm"
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

function BuyConfirmQtyBg({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 80 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <rect x="5" y="5" width="70" height="26" fill="#D5D8DD" />
      <rect y="10" width="5" height="16" fill="#070C19" />
      <rect x="75" y="10" width="5" height="16" fill="#070C19" />
      <rect x="5" y="0" width="70" height="5" fill="#070C19" />
      <rect x="5" y="31" width="70" height="5" fill="#070C19" />
      <rect x="5" y="5" width="5" height="5" fill="#070C19" />
      <rect x="70" y="5" width="5" height="5" fill="#070C19" />
      <rect x="5" y="26" width="5" height="5" fill="#070C19" />
      <rect x="70" y="26" width="5" height="5" fill="#070C19" />
      <path d="M70 5H10V10H70V5Z" fill="white" />
      <path d="M10 31L70 31L70 26L10 26L10 31Z" fill="#ACB0BC" />
      <path d="M75 26L75 10L70 10L70 26L75 26Z" fill="#ACB0BC" />
      <path d="M5 10L5 26L10 26L10 10L5 10Z" fill="white" />
    </svg>
  );
}
