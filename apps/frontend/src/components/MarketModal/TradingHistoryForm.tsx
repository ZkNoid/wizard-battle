'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  TradingHistoryFilterPanel,
  type TradingHistoryFilters,
} from './TradingHistoryFilterPanel';
import { TradingHistoryList } from './TradingHistoryList';
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

  const filteredItems = useMemo(() => {
    let items = [...MARKET_HISTORY_ITEMS];

    if (filters.category !== 'all') {
      items = items.filter((item) => item.type === filters.category);
    }

    const now = Date.now();
    switch (filters.sortBy) {
      case 'all_time':
        items = items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        break;
      case 'last_24h':
        items = items.filter(
          (item) => now - new Date(item.date).getTime() <= 24 * 60 * 60 * 1000
        );
        break;
      case 'last_week':
        items = items.filter(
          (item) =>
            now - new Date(item.date).getTime() <= 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'last_month':
        items = items.filter(
          (item) =>
            now - new Date(item.date).getTime() <= 30 * 24 * 60 * 60 * 1000
        );
        break;
      case 'price_high':
        items = items.sort((a, b) => b.price - a.price);
        break;
      case 'price_low':
        items = items.sort((a, b) => a.price - b.price);
        break;
      case 'only_gold':
        items = items.filter((item) => item.priceCurrency === 'gold');
        break;
      case 'only_usdc':
        items = items.filter((item) => item.priceCurrency === 'usdc');
        break;
    }

    return items;
  }, [filters]);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Trading History" onClose={onClose ?? (() => {})} />

      <TradingHistoryFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onTabChange={onTabChange}
      />

      <TradingHistoryList items={filteredItems} />
    </div>
  );
}
