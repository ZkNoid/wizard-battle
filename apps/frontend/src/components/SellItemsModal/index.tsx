'use client';

import { useState } from 'react';
import Image from 'next/image';
import ModalTitle from '../shared/ModalTitle';
import { Button } from '../shared/Button';
import { QuantitySelector } from '../shared/QuantitySelector';
import { ItemBg } from '../InventoryModal/assets/item-bg';
import { MarketModalBg } from '../MarketModal/assets/market-modal-bg';
import { useInventoryStore } from '@/lib/store';
import { useModalSound } from '@/lib/hooks/useAudio';
import type {
  InventoryFilterType,
  IUserInventoryItem,
} from '@/lib/types/Inventory';

interface SellItemsModalProps {
  onClose: () => void;
}

export default function SellItemsModal({ onClose }: SellItemsModalProps) {
  useModalSound();

  const iteminventory = useInventoryStore((state) => state.iteminventory);

  const [activeFilter, setActiveFilter] = useState<InventoryFilterType>('all');
  const [selectedItem, setSelectedItem] = useState<IUserInventoryItem | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'gold' | 'usdc'>('gold');

  const filteredItems =
    activeFilter === 'all'
      ? iteminventory
      : iteminventory.filter((ui) => ui.item.type === activeFilter);

  const handleSelectItem = (userItem: IUserInventoryItem) => {
    setSelectedItem(userItem);
    setQuantity(1);
    setPrice('');
  };

  const handleSell = () => {
    if (!selectedItem || !price || Number(price) <= 0) return;
    console.log(
      'Selling',
      quantity,
      'x',
      selectedItem.item.title,
      'for',
      price,
      currency
    );
    setSelectedItem(null);
    setPrice('');
    setQuantity(1);
  };

  const isItemSelected = (userItem: IUserInventoryItem) =>
    selectedItem?.item.id === userItem.item.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-320 h-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 flex h-full w-full flex-row gap-6 px-4 py-4">
          {/* Left: inventory grid */}
          <div className="flex flex-1 flex-col gap-4">
            <ModalTitle title="Sell Items" onClose={onClose} />

            {/* Items grid */}
            <div className="grid grid-cols-7 gap-2.5">
              {filteredItems.map((userItem) => (
                <div
                  key={userItem.item.id}
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200 ${
                    isItemSelected(userItem)
                      ? 'brightness-110'
                      : 'hover:brightness-105'
                  }`}
                  onClick={() => handleSelectItem(userItem)}
                >
                  <Image
                    src={`/items/${userItem.item.image}`}
                    width={100}
                    height={100}
                    alt={userItem.item.title}
                    quality={100}
                    unoptimized
                    className="size-full object-contain object-center"
                  />
                  <div className="font-pixel text-main-gray absolute bottom-2 right-2 text-sm font-bold">
                    {userItem.quantity}
                  </div>
                  <ItemBg
                    className={`-z-1 pointer-events-none absolute inset-0 size-full select-none transition-opacity duration-200 ${
                      isItemSelected(userItem) ? 'opacity-60' : ''
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: sell form */}
          <div className="flex w-72 flex-col gap-5 pt-6">
            {selectedItem ? (
              <>
                {/* Item preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="size-25 relative p-4">
                    <Image
                      src={`/items/${selectedItem.item.image}`}
                      width={100}
                      height={100}
                      alt={selectedItem.item.title}
                      quality={100}
                      unoptimized
                      className="size-full object-contain object-center"
                    />
                    <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full" />
                  </div>
                  <span className="font-pixel text-main-gray text-center text-sm font-bold">
                    {selectedItem.item.title}
                  </span>
                  <span className="font-pixel text-main-gray/60 text-center text-xs">
                    {selectedItem.item.type
                      .replace('gear_', 'Gear: ')
                      .replace(/^\w/, (c) => c.toUpperCase())}
                    &nbsp;·&nbsp; x{selectedItem.quantity} available
                  </span>
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-pixel text-main-gray/70 text-xs font-bold uppercase tracking-widest">
                    Quantity
                  </span>
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={selectedItem.quantity}
                  />
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-pixel text-main-gray/70 text-xs font-bold uppercase tracking-widest">
                    Price per item
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price..."
                    className="font-pixel text-main-gray w-full bg-[#D5D8DD] px-3 py-2 text-sm font-bold outline-none placeholder:text-[#747C8F]"
                  />
                </div>

                {/* Currency */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-pixel text-main-gray/70 text-xs font-bold uppercase tracking-widest">
                    Currency
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={currency === 'gold' ? 'gray' : 'lightGray'}
                      className="h-10 flex-1"
                      onClick={() => setCurrency('gold')}
                      enableClickSound
                    >
                      <div className="flex items-center gap-1.5">
                        <Image
                          src="/icons/gold-coin.png"
                          width={14}
                          height={14}
                          alt="gold"
                          className="h-3.5 w-3.5 object-contain"
                          unoptimized
                        />
                        <span className="font-pixel text-main-gray text-xs font-bold">
                          Gold
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant={currency === 'usdc' ? 'gray' : 'lightGray'}
                      className="h-10 flex-1"
                      onClick={() => setCurrency('usdc')}
                      enableClickSound
                    >
                      <div className="flex items-center gap-1.5">
                        <Image
                          src="/icons/usdс-coin.png"
                          width={14}
                          height={14}
                          alt="usdc"
                          className="h-3.5 w-3.5 object-contain"
                          unoptimized
                        />
                        <span className="font-pixel text-main-gray text-xs font-bold">
                          USDC
                        </span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                {price && Number(price) > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <span className="font-pixel text-main-gray/70 text-xs">
                      Total:
                    </span>
                    <div className="flex items-center gap-1">
                      <Image
                        src={
                          currency === 'gold'
                            ? '/icons/gold-coin.png'
                            : '/icons/usdс-coin.png'
                        }
                        width={14}
                        height={14}
                        alt={currency}
                        className="h-3.5 w-3.5 object-contain"
                        unoptimized
                      />
                      <span className="font-pixel text-main-gray text-sm font-bold">
                        {Number(price) * quantity}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sell button */}
                <Button
                  variant="gray"
                  className="mt-auto h-12 w-full"
                  onClick={handleSell}
                  enableHoverSound
                  enableClickSound
                >
                  <span className="font-pixel text-main-gray text-base font-bold">
                    Sell
                  </span>
                </Button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <span className="font-pixel text-main-gray/40 text-center text-sm">
                  Select an item from
                  <br />
                  your inventory to sell
                </span>
              </div>
            )}
          </div>
        </div>

        <MarketModalBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}
