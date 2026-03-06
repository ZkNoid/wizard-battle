'use client';

import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { Button } from '../shared/Button';
import {
  MARKET_CATEGORY_OPTIONS,
  MARKET_HISTORY_SORT_OPTIONS,
  MARKET_HISTORY_STATUS_OPTIONS,
} from '@/lib/constants/market';

export interface TradingHistoryFilters {
  sortBy: string;
  category: string;
}

interface TradingHistoryFilterPanelProps {
  filters: TradingHistoryFilters;
  onFiltersChange: (filters: TradingHistoryFilters) => void;
  onTabChange?: (tab: string) => void;
}

export function TradingHistoryFilterPanel({
  filters,
  onFiltersChange,
  onTabChange,
}: TradingHistoryFilterPanelProps) {
  const update = (patch: Partial<TradingHistoryFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="grid w-full grid-cols-5 items-end gap-4">
      <SelectWithLabel
        label="Item type"
        options={MARKET_CATEGORY_OPTIONS}
        value={filters.category}
        onChange={(category) => update({ category })}
      />

      <SelectWithLabel
        label="Sort by"
        options={MARKET_HISTORY_SORT_OPTIONS}
        value={filters.sortBy}
        onChange={(sortBy) => update({ sortBy })}
      />
    </div>
  );
}
