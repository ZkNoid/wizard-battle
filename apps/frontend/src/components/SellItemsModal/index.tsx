'use client';

import { useMemo, useState } from 'react';
import { parseEther } from 'viem';
import ModalTitle from '../shared/ModalTitle';
import { Button } from '../shared/Button';
import { QuantitySelector } from '../shared/QuantitySelector';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { SellsItemsModalBg } from './assets/sells-items-modal-bg';
import { OfferPreview } from './OfferPreview';
import { useInventoryStore } from '@/lib/store';
import { useModalSound } from '@/lib/hooks/useAudio';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { useGameMarket } from '@/lib/hooks/useGameMarket';
import {
  MARKET_CURRENCY_OPTIONS,
  MARKET_SELL_ITEM_TYPE_OPTIONS,
} from '@/lib/constants/market';

const GAME_REGISTRY_ADDRESS = process.env
  .NEXT_PUBLIC_GAME_REGISTRY_ADDRESS as `0x${string}`;
const USDC_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_TOKEN_ADDRESS as `0x${string}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const GOLD_RESOURCE_ID = 'Gold';

interface SellItemsModalProps {
  onClose: () => void;
}

export default function SellItemsModal({ onClose }: SellItemsModalProps) {
  useModalSound();

  const iteminventory = useInventoryStore((state) => state.iteminventory);
  const { setIsRequestSuccessModalOpen, setIsRequestFailureModalOpen } =
    useMiscellaneousSessionStore();
  const { createOrder, approveNFT, isPending, getGameElement } =
    useGameMarket();

  const [title, setTitle] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemType, setItemType] = useState('');
  const [currency, setCurrency] = useState('Gold');
  const [price, setPrice] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

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

  const handlePlaceOrder = async () => {
    if (!selectedItemId || !price || Number(price) <= 0 || !selectedUserItem)
      return;

    setIsPlacing(true);
    try {
      console.log('[handlePlaceOrder] fetching game element for item:', selectedUserItem.item.id);
      const gameElement = await getGameElement(selectedUserItem.item.id);
      if (!gameElement) {
        throw new Error(`Game element not registered for item: ${selectedUserItem.item.id}`);
      }
      console.log('[handlePlaceOrder] gameElement:', gameElement);

      const priceWei = parseEther(price);

      const isGoldPayment = currency === 'gold';
      console.log('[handlePlaceOrder] currency:', currency, '| isGoldPayment:', isGoldPayment);

      const goldElement = isGoldPayment
        ? await getGameElement(GOLD_RESOURCE_ID)
        : null;
      console.log('[handlePlaceOrder] goldElement:', goldElement);

      const paymentToken = isGoldPayment
        ? (GAME_REGISTRY_ADDRESS ?? ZERO_ADDRESS)
        : (USDC_TOKEN_ADDRESS ?? ZERO_ADDRESS);
      const paymentTokenId =
        isGoldPayment && goldElement ? goldElement.tokenId : 0n;

      console.log('[handlePlaceOrder] paymentToken:', paymentToken, '| paymentTokenId:', paymentTokenId);
      if (isGoldPayment && paymentTokenId === 0n) {
        console.error('[handlePlaceOrder] paymentTokenId=0 for gold — goldElement missing or not registered');
      }

      if (gameElement.tokenAddress) {
        await approveNFT(gameElement.tokenAddress, true);
      }

      await createOrder({
        itemId: selectedUserItem.item.id,
        token: gameElement.tokenAddress,
        tokenId: gameElement.tokenId,
        price: priceWei,
        amount: BigInt(quantity),
        paymentToken,
        paymentTokenId,
        title: title || selectedUserItem.item.title,
      });

      setIsRequestSuccessModalOpen(true);
      onClose();
    } catch (error) {
      console.error('Failed to place order:', error);
      setIsRequestFailureModalOpen(true);
    } finally {
      setIsPlacing(false);
    }
  };

  const totalPrice =
    price && Number(price) > 0 ? Number(price) * quantity : null;

  const isFormValid =
    title.trim() !== '' &&
    selectedItemId !== '' &&
    itemType !== '' &&
    price !== '' &&
    Number(price) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
              value={title}
              onChange={setTitle}
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
            disabled={!isFormValid || isPlacing || isPending}
            enableHoverSound
            enableClickSound
            isLong
          >
            <span className="font-pixel text-main-gray text-lg font-bold">
              {isPlacing || isPending ? 'Placing order...' : 'Place order'}
            </span>
          </Button>
        </div>

        <SellsItemsModalBg className="absolute inset-0 -z-10 h-full w-full" />
      </div>
    </div>
  );
}
