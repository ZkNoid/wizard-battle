'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  ItemsSellingFilterPanel,
  type ItemsSellingFilters,
} from './ItemsSellingFilterPanel';
import { SellingList } from './SellingList';
import { CancelSaleConfirmModal } from './CancelSaleConfirmModal';
import { useMarketStore } from '@/lib/store';
import { useGameMarket } from '@/lib/hooks/useGameMarket';
import { mapOrderToSellingItem } from '@/lib/utils/marketUtils';
import type { IMarketSellingItem } from '@/lib/types/IMarket';
import { MARKET_SELLING_ITEMS } from '@/lib/constants/market';

interface ItemsSellingFormProps {
  onClose?: () => void;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_FILTERS: ItemsSellingFilters = {
  sortBy: 'new_to_old',
  category: 'all',
};

export function ItemsSellingForm({
  onClose,
  onTabChange,
}: ItemsSellingFormProps) {
  const [filters, setFilters] = useState<ItemsSellingFilters>(DEFAULT_FILTERS);
  const [cancelTarget, setCancelTarget] = useState<IMarketSellingItem | null>(
    null
  );
  const [isCanceling, setIsCanceling] = useState(false);

  const { userSellingOrders, isLoadingUserOrders, removeOrder } =
    useMarketStore();
  const { cancelOrder, pauseOrder, unpauseOrder, isPending } = useGameMarket();

  const items = useMemo<IMarketSellingItem[]>(() => {
    if (userSellingOrders.length === 0) {
      return MARKET_SELLING_ITEMS;
    }

    return userSellingOrders.map((order) => mapOrderToSellingItem(order));
  }, [userSellingOrders]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filters.category !== 'all') {
      result = result.filter((item) => item.type === filters.category);
    }

    switch (filters.sortBy) {
      case 'new_to_old':
        result = result.sort(
          (a, b) =>
            new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
        );
        break;
      case 'old_to_new':
        result = result.sort(
          (a, b) =>
            new Date(a.listedAt).getTime() - new Date(b.listedAt).getTime()
        );
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

  const handleCancelRequest = (id: string) => {
    const item = items.find((i) => i.id === id) ?? null;
    setCancelTarget(item);
  };

  const handleCancelConfirm = async (item: IMarketSellingItem) => {
    if (!item.orderId) {
      removeOrder(parseInt(item.id, 10));
      setCancelTarget(null);
      return;
    }

    setIsCanceling(true);
    try {
      await cancelOrder(BigInt(item.orderId));
      setCancelTarget(null);
    } catch (error) {
      console.error('Cancel failed:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Items on Market" onClose={onClose ?? (() => {})} />

      <ItemsSellingFilterPanel filters={filters} onFiltersChange={setFilters} />

      {isLoadingUserOrders ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-pixel text-main-gray">
            Loading your listings...
          </span>
        </div>
      ) : (
        <SellingList items={filteredItems} onCancel={handleCancelRequest} />
      )}

      {cancelTarget && (
        <CancelSaleConfirmModal
          item={cancelTarget}
          onConfirm={handleCancelConfirm}
          onBack={() => setCancelTarget(null)}
          isLoading={isCanceling || isPending}
        />
      )}
    </div>
  );
}
