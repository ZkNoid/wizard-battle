'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  BuyItemsFilterPanel,
  type BuyItemsFilters,
} from './BuyItemsFilterPanel';
import { BuyItemsList } from './BuyItemsList';
import { BuyConfirmModal } from './BuyConfirmModal';
import { useMarketStore } from '@/lib/store';
import { useGameMarket } from '@/lib/hooks/useGameMarket';
import { mapOrderToBuyItem } from '@/lib/utils/marketUtils';
import type { IMarketBuyItem } from '@/lib/types/IMarket';

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

  const { openOrders, isLoadingOrders } = useMarketStore();
  const { buyWithETH, buyWithERC20, isPending } = useGameMarket();

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

      if (item.priceCurrency === 'eth') {
        await buyWithETH(orderId, priceWei);
      } else if (item.paymentToken) {
        await buyWithERC20(orderId, priceWei, item.paymentToken as `0x${string}`);
      } else {
        console.error('Invalid order: missing paymentToken for ERC20 payment');
        return;
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
