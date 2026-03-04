'use client';

import { Button } from '../shared/Button';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import {
  MARKET_CATEGORY_OPTIONS,
  MARKET_SELLING_SORT_OPTIONS,
} from '@/lib/constants/market';

export interface ItemsSellingFilters {
  sortBy: string;
  category: string;
}

interface ItemsSellingFilterPanelProps {
  filters: ItemsSellingFilters;
  onFiltersChange: (filters: ItemsSellingFilters) => void;
  onTabChange?: (tab: string) => void;
}

export function ItemsSellingFilterPanel({
  filters,
  onFiltersChange,
  onTabChange,
}: ItemsSellingFilterPanelProps) {
  const update = (patch: Partial<ItemsSellingFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="grid w-full grid-cols-5 items-end gap-4">
      <div className="flex flex-col justify-end px-2 pb-2">
        <Button
          variant="blue"
          className="h-12 w-full"
          onClick={() => onTabChange?.('selling')}
          enableHoverSound
          enableClickSound
        >
          <span className="font-pixel text-base font-bold text-white">
            Sell my items
          </span>
        </Button>
      </div>
      <SelectWithLabel
        label="Item type"
        options={MARKET_CATEGORY_OPTIONS}
        value={filters.category}
        onChange={(category) => update({ category })}
      />

      <SelectWithLabel
        label="Sort by"
        options={MARKET_SELLING_SORT_OPTIONS}
        value={filters.sortBy}
        onChange={(sortBy) => update({ sortBy })}
      />
    </div>
  );
}
