'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  BuyItemsFilterPanel,
  type BuyItemsFilters,
} from './BuyItemsFilterPanel';
import { BuyItemsList } from './BuyItemsList';
import { BuyConfirmModal } from './BuyConfirmModal';
import { useMarketStore, useInventoryStore } from '@/lib/store';
import { useGameMarket } from '@/lib/hooks/useGameMarket';
import { mapOrderToBuyItem } from '@/lib/utils/marketUtils';
import type { IMarketBuyItem } from '@/lib/types/IMarket';
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';
import type { MarketItemPurchasedProps } from '@/lib/analytics/types';
import { api } from '@/trpc/react';
import { useMinaAppkit } from 'mina-appkit';
import { useAppKitAccount } from '@reown/appkit/react';
import { usePublicClient } from 'wagmi';

interface BuyItemsFormProps {
  onClose?: () => void;
  onTabChange?: (tab: string) => void;
  onOpenSellItems?: () => void;
}

const DEFAULT_FILTERS: BuyItemsFilters = {
  search: '',
  sortBy: 'new_to_old',
  category: 'all',
};

export function BuyItemsForm({
  onClose,
  onTabChange,
  onOpenSellItems,
}: BuyItemsFormProps) {
  const [filters, setFilters] = useState<BuyItemsFilters>(DEFAULT_FILTERS);
  const [selectedItem, setSelectedItem] = useState<IMarketBuyItem | null>(null);
  const [isBuying, setIsBuying] = useState(false);

  const { address: minaAddress } = useMinaAppkit();
  const { address: evmAddress } = useAppKitAccount();
  const publicClient = usePublicClient();

  const { openOrders, isLoadingOrders } = useMarketStore();
  const { buyWithETH, buyWithERC20, buyWithERC1155, isPending } = useGameMarket();
  const { loadUserInventory, loadOnchainBalances } = useInventoryStore();
  const fulfillOrderMutation = api.inventory.fulfillOrder.useMutation();

  const items = useMemo<IMarketBuyItem[]>(() => {
    return openOrders.map((order) => mapOrderToBuyItem(order));
  }, [openOrders]);

  const handleBuyConfirm = async (item: IMarketBuyItem, _quantity: number) => {
    if (!item.orderId) {
      console.error('Invalid order: missing orderId');
      return;
    }

    setIsBuying(true);
    try {
      const orderId = BigInt(item.orderId);
      const priceWei = BigInt(Math.floor(item.price * 1e18));

      let result: { txHash: `0x${string}` } | undefined;

      if (item.priceCurrency === 'eth') {
        result = await buyWithETH(orderId, priceWei) ?? undefined;
      } else if (item.paymentToken) {
        const paymentTokenId = item.paymentTokenId ? BigInt(item.paymentTokenId) : 0n;
        if (paymentTokenId > 0n) {
          result = await buyWithERC1155(orderId, item.paymentToken as `0x${string}`) ?? undefined;
        } else {
          result = await buyWithERC20(orderId, priceWei, item.paymentToken as `0x${string}`) ?? undefined;
        }
      } else {
        console.error('Invalid order: missing paymentToken for ERC20 payment');
        return;
      }

      const purchased: MarketItemPurchasedProps = {
        item_id: item.id,
        title: item.title,
        order_id: String(item.orderId ?? ''),
        price: item.price,
        price_currency: item.priceCurrency,
        quantity: item.quantity,
      };
      trackEvent(AnalyticsEvents.MARKET_ITEM_PURCHASED, purchased);

      // Notify backend: verifies tx on-chain, adds item, removes cost.
      // The chain transfer already happened, so we always refresh balances
      // even if the DB sync fails.
      if (result?.txHash && minaAddress && evmAddress) {
        try {
          await fulfillOrderMutation.mutateAsync({
            txHash: result.txHash,
            orderId: String(item.orderId),
            buyerEvmAddress: evmAddress,
            buyerMinaAddress: minaAddress,
            itemId: item.title,
          });
        } catch (err) {
          console.warn('[buy] fulfillOrder failed:', err);
        }

        void loadUserInventory(minaAddress);
      }
      if (evmAddress && publicClient) {
        void loadOnchainBalances(evmAddress, publicClient);
      }

      setSelectedItem(null);
    } catch (error) {
      console.error('Buy failed:', error);
    } finally {
      setIsBuying(false);
    }
  };

  const filteredItems = useMemo<IMarketBuyItem[]>(() => {
    let result = [...items];

    if (filters.category !== 'all') {
      result = result.filter((item) => item.type === filters.category);
    }

    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
    }

    switch (filters.sortBy) {
      case 'new_to_old':
        break;
      case 'old_to_new':
        result = result.reverse();
        break;
      case 'price_high':
        result = result.sort((a, b) => b.price - a.price);
        break;
      case 'price_low':
        result = result.sort((a, b) => a.price - b.price);
        break;
      case 'only_gold':
        result = result.filter((item) => item.priceCurrency === 'gold');
        break;
      case 'only_usdc':
        result = result.filter((item) => item.priceCurrency === 'usdc');
        break;
    }

    return result;
  }, [items, filters]);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="P2P Market" onClose={onClose ?? (() => {})} />

      <BuyItemsFilterPanel filters={filters} onFiltersChange={setFilters} />

      {isLoadingOrders ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-pixel text-main-gray">Loading orders...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-pixel text-main-gray/70">
            No items available for sale
          </span>
        </div>
      ) : (
        <BuyItemsList items={filteredItems} onItemClick={setSelectedItem} />
      )}

      {selectedItem && (
        <BuyConfirmModal
          item={selectedItem}
          onConfirm={handleBuyConfirm}
          onCancel={() => setSelectedItem(null)}
          isLoading={isBuying || isPending}
        />
      )}
    </div>
  );
}
