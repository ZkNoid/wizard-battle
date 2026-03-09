'use client';

import { useMemo, useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import ModalTitle from '../shared/ModalTitle';
import {
  TradingHistoryFilterPanel,
  type TradingHistoryFilters,
} from './TradingHistoryFilterPanel';
import { TradingHistoryList } from './TradingHistoryList';
import { useMarketStore } from '@/lib/store';
import { mapOrderToHistoryItem } from '@/lib/utils/marketUtils';
import type { IMarketHistoryItem } from '@/lib/types/IMarket';
import { MARKET_HISTORY_ITEMS } from '@/lib/constants/market';

interface TradingHistoryFormProps {
  onClose?: () => void;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_FILTERS: TradingHistoryFilters = {
  sortBy: 'all_time',
  category: 'all',
};

export function TradingHistoryForm({
  onClose,
  onTabChange,
}: TradingHistoryFormProps) {
  const [filters, setFilters] =
    useState<TradingHistoryFilters>(DEFAULT_FILTERS);

  const { address } = useAppKitAccount();
  const { userHistory, isLoadingHistory } = useMarketStore();

  const items = useMemo<IMarketHistoryItem[]>(() => {
    if (userHistory.length === 0) {
      return MARKET_HISTORY_ITEMS;
    }

    return userHistory.map((order) =>
      mapOrderToHistoryItem(order, address || '')
    );
  }, [userHistory, address]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filters.category !== 'all') {
      result = result.filter((item) => item.type === filters.category);
    }

    const now = Date.now();
    switch (filters.sortBy) {
      case 'all_time':
        result = result.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      case 'last_24h':
        result = result.filter(
          (item) => now - new Date(item.date).getTime() <= 24 * 60 * 60 * 1000
        );
        break;
      case 'last_week':
        result = result.filter(
          (item) =>
            now - new Date(item.date).getTime() <= 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'last_month':
        result = result.filter(
          (item) =>
            now - new Date(item.date).getTime() <= 30 * 24 * 60 * 60 * 1000
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

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Trading History" onClose={onClose ?? (() => {})} />

      <TradingHistoryFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onTabChange={onTabChange}
      />

      {isLoadingHistory ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="font-pixel text-main-gray">Loading history...</span>
        </div>
      ) : (
        <TradingHistoryList items={filteredItems} />
      )}
    </div>
  );
}
