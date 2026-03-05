'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import { Button } from '../shared/Button';
import { QuantitySelector } from '../shared/QuantitySelector';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { SellsItemsModalBg } from './assets/sells-items-modal-bg';
import { OfferPreview } from './OfferPreview';
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
            <div className="flex w-full flex-row items-end gap-3">
              <div className="w-[55%]">
                <SelectWithLabel
                  label="Choose Item & Quantity"
                  options={inventoryOptions}
                  value={selectedItemId}
                  onChange={handleItemChange}
                  placeholder="Choose item you want to sale"
                />
              </div>
              <div className="flex flex-1 justify-center pb-3">
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={maxQuantity}
                />
              </div>
            </div>

            {/* Choose type of items */}
            <div className="w-[55%]">
              <SelectWithLabel
                label="Choose type of items"
                options={MARKET_SELL_ITEM_TYPE_OPTIONS}
                value={itemType}
                onChange={setItemType}
                placeholder="item type"
              />
            </div>

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
            <OfferPreview
              selectedUserItem={selectedUserItem}
              quantity={quantity}
              currency={currency}
              totalPrice={totalPrice}
            />
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
