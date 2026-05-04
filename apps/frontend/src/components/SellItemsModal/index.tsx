'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { MARKET_CURRENCY_OPTIONS } from '@/lib/constants/market';
import type { IUserInventoryItem } from '@/lib/types/Inventory';
import { api } from '@/trpc/react';
import { useInventorySync } from '@/lib/hooks/useInventorySync';
import { useMinaAppkit } from 'mina-appkit';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePublicClient } from 'wagmi';

/** Wait after commit tx confirms before re-reading chain + DB (indexing lag). */
const POST_COMMIT_REFETCH_MS = 3000;

function onchainQuantity(ui: IUserInventoryItem): number {
  const b = ui.onchainBalance;
  if (b === undefined || b <= 0n) return 0;
  const n = Number(b);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

const USDC_TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_TOKEN_ADDRESS as `0x${string}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const GOLD_RESOURCE_ID = 'Gold';

interface SellItemsModalProps {
  onClose: () => void;
}

export default function SellItemsModal({ onClose }: SellItemsModalProps) {
  useModalSound();

  const { address: minaAddress } = useMinaAppkit();
  const { address: evmAddress } = useAppKitAccount();
  const publicClient = usePublicClient();
  const iteminventory = useInventoryStore((state) => state.iteminventory);
  const loadUserInventory = useInventoryStore(
    (state) => state.loadUserInventory
  );
  const loadOnchainBalances = useInventoryStore(
    (state) => state.loadOnchainBalances
  );

  const syncAllMutation = api.inventory.syncAll.useMutation();
  const { processInventoryData } = useInventorySync();
  const postCommitRefetchTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (postCommitRefetchTimeoutRef.current) {
        clearTimeout(postCommitRefetchTimeoutRef.current);
      }
    };
  }, []);

  const runCommitInventory = useCallback(() => {
    if (!minaAddress) return;
    if (postCommitRefetchTimeoutRef.current) {
      clearTimeout(postCommitRefetchTimeoutRef.current);
      postCommitRefetchTimeoutRef.current = null;
    }
    syncAllMutation.mutate(
      { userId: minaAddress },
      {
        onSuccess: async (data) => {
          try {
            await processInventoryData(data);
          } catch (e) {
            console.error('processInventoryData failed:', e);
            return;
          }
          postCommitRefetchTimeoutRef.current = setTimeout(() => {
            postCommitRefetchTimeoutRef.current = null;
            void loadUserInventory(minaAddress);
            if (evmAddress && publicClient) {
              void loadOnchainBalances(evmAddress, publicClient);
            }
          }, POST_COMMIT_REFETCH_MS);
        },
        onError: (err) => console.error('syncAll error:', err),
      }
    );
  }, [
    minaAddress,
    evmAddress,
    publicClient,
    syncAllMutation,
    processInventoryData,
    loadUserInventory,
    loadOnchainBalances,
  ]);

  const sellableInventory = useMemo(
    () => iteminventory.filter((ui) => onchainQuantity(ui) > 0),
    [iteminventory]
  );
  const { setIsRequestSuccessModalOpen, setIsRequestFailureModalOpen } =
    useMiscellaneousSessionStore();
  const { createOrder, approveNFT, isPending, getGameElement } =
    useGameMarket();

  const [selectedItemId, setSelectedItemId] = useState('Gold');
  const [quantity, setQuantity] = useState(1);
  const [currency, setCurrency] = useState('Gold');
  const [price, setPrice] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const inventoryOptions = useMemo(
    () =>
      sellableInventory.map((ui) => ({
        value: ui.item.id,
        label: `${ui.item.title} (x${onchainQuantity(ui)})`,
      })),
    [sellableInventory]
  );

  const selectedUserItem = useMemo(
    () => sellableInventory.find((ui) => ui.item.id === selectedItemId) ?? null,
    [sellableInventory, selectedItemId]
  );

  const maxQuantity = selectedUserItem
    ? Math.max(1, onchainQuantity(selectedUserItem))
    : 1;

  useEffect(() => {
    if (
      selectedItemId &&
      !sellableInventory.some((ui) => ui.item.id === selectedItemId)
    ) {
      setSelectedItemId('');
      setQuantity(1);
    }
  }, [sellableInventory, selectedItemId]);

  const handleItemChange = (id: string) => {
    setSelectedItemId(id);
    setQuantity(1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedItemId || !price || Number(price) <= 0 || !selectedUserItem)
      return;

    setIsPlacing(true);
    try {
      console.log(
        '[handlePlaceOrder] fetching game element for item:',
        selectedUserItem.item.id
      );
      const gameElement = await getGameElement(selectedUserItem.item.id);
      if (!gameElement) {
        throw new Error(
          `Game element not registered for item: ${selectedUserItem.item.id}`
        );
      }
      console.log('[handlePlaceOrder] gameElement:', gameElement);

      // Gold is an ERC-1155 with 0 decimals — price is a plain integer, not wei.
      const priceOnchain = BigInt(Math.round(Number(price)));

      const isGoldPayment = currency === 'Gold';
      console.log(
        '[handlePlaceOrder] currency:',
        currency,
        '| isGoldPayment:',
        isGoldPayment
      );

      const goldElement = isGoldPayment
        ? await getGameElement(GOLD_RESOURCE_ID)
        : null;
      console.log('[handlePlaceOrder] goldElement:', goldElement);

      const paymentToken = isGoldPayment
        ? (goldElement?.tokenAddress ?? ZERO_ADDRESS)
        : (USDC_TOKEN_ADDRESS ?? ZERO_ADDRESS);
      const paymentTokenId =
        isGoldPayment && goldElement ? goldElement.tokenId : 0n;

      console.log(
        '[handlePlaceOrder] paymentToken:',
        paymentToken,
        '| paymentTokenId:',
        paymentTokenId
      );
      if (isGoldPayment && paymentTokenId === 0n) {
        console.error(
          '[handlePlaceOrder] paymentTokenId=0 for gold — goldElement missing or not registered'
        );
      }

      if (gameElement.tokenAddress) {
        await approveNFT(gameElement.tokenAddress, true);
      }

      await createOrder({
        itemId: selectedUserItem.item.id,
        token: gameElement.tokenAddress,
        tokenId: gameElement.tokenId,
        price: priceOnchain,
        amount: BigInt(quantity),
        paymentToken,
        paymentTokenId,
        title: selectedUserItem.item.title,
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
    selectedItemId !== '' && price !== '' && Number(price) > 0;

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

            <p className="font-pixel-klein text-main-gray/80 -mt-1 text-center text-xs leading-relaxed">
              If you do not see your items —{' '}
              <button
                type="button"
                onClick={runCommitInventory}
                disabled={!minaAddress || syncAllMutation.isPending}
                className="font-pixel-klein text-sky-400 underline decoration-sky-400/80 underline-offset-2 transition-colors hover:text-sky-300 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
              >
                commit
              </button>{' '}
              them first.
            </p>

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
