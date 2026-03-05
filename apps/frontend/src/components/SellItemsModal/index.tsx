'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import ModalTitle from '../shared/ModalTitle';
import { Button } from '../shared/Button';
import { QuantitySelector } from '../shared/QuantitySelector';
import { Select } from '../shared/Select';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { BuyItemBg } from '../MarketModal/assets/buy-item-bg';
import { SellsItemsModalBg } from './assets/sells-items-modal-bg';
import { useInventoryStore } from '@/lib/store';
import { useModalSound } from '@/lib/hooks/useAudio';
import {
  MARKET_CURRENCY_OPTIONS,
  MARKET_SELL_ITEM_TYPE_OPTIONS,
} from '@/lib/constants/market';

interface SellItemsModalProps {
  onClose: () => void;
}

export default function SellItemsModal({ onClose }: SellItemsModalProps) {
  useModalSound();

  const iteminventory = useInventoryStore((state) => state.iteminventory);

  const [itemName, setItemName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemType, setItemType] = useState('');
  const [currency, setCurrency] = useState('gold');
  const [price, setPrice] = useState('');

  const inventoryOptions = useMemo(
    () =>
      iteminventory.map((ui) => ({
        value: ui.item.id,
        label: `${ui.item.title} (x${ui.quantity})`,
      })),
    [iteminventory]
  );

  const selectedUserItem = useMemo(
    () => iteminventory.find((ui) => ui.item.id === selectedItemId) ?? null,
    [iteminventory, selectedItemId]
  );

  const maxQuantity = selectedUserItem?.quantity ?? 1;

  const handleItemChange = (id: string) => {
    setSelectedItemId(id);
    setQuantity(1);
  };

  const handlePlaceOrder = () => {
    if (!selectedItemId || !price || Number(price) <= 0) return;
    console.log('Placing order:', {
      selectedItemId,
      itemName,
      quantity,
      itemType,
      currency,
      price,
    });
    onClose();
  };

  const currencyIcon =
    currency === 'gold' ? '/icons/gold-coin.png' : '/icons/usdс-coin.png';

  const totalPrice =
    price && Number(price) > 0 ? Number(price) * quantity : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-160 h-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 flex h-full flex-col px-4 pb-8 pt-2">
          <ModalTitle title="Sell Items" onClose={onClose} />

          <div className="mt-4 flex flex-col gap-4">
            {/* Item name */}
            <InputWithLabel
              label="Item name"
              value={itemName}
              onChange={setItemName}
              placeholder="Give name for Item you want to sell"
              size="xl"
            />

            {/* Choose Item & Quantity */}
            <div className="flex flex-col gap-1">
              <span className="font-pixel text-main-gray text-base font-bold">
                Choose Item & Quantity
              </span>
              <div className="flex items-center gap-3">
                <Select
                  className="flex-1"
                  options={inventoryOptions}
                  value={selectedItemId}
                  onChange={handleItemChange}
                  placeholder="Choose item you want to sale"
                />
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={maxQuantity}
                />
              </div>
            </div>

            {/* Choose type of items */}
            <SelectWithLabel
              label="Choose type of items"
              options={MARKET_SELL_ITEM_TYPE_OPTIONS}
              value={itemType}
              onChange={setItemType}
              placeholder="item type"
            />

            {/* Currency + Amount */}
            <div className="flex flex-row gap-4">
              <SelectWithLabel
                className="flex-1"
                label="Choose currency"
                options={MARKET_CURRENCY_OPTIONS}
                value={currency}
                onChange={setCurrency}
              />
              <InputWithLabel
                className="flex-1"
                label="Enter amount"
                value={price}
                onChange={setPrice}
                placeholder="Enter your price here"
                type="number"
              />
            </div>

            {/* Your offer preview */}
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
          </div>

          {/* Place order */}
          <Button
            variant="gray"
            className="mt-auto h-14 w-full"
            onClick={handlePlaceOrder}
            enableHoverSound
            enableClickSound
          >
            <span className="font-pixel text-main-gray text-lg font-bold">
              Place order
            </span>
          </Button>
        </div>

        <SellsItemsModalBg className="absolute inset-0 -z-10 h-full w-full" />
      </div>
    </div>
  );
}
