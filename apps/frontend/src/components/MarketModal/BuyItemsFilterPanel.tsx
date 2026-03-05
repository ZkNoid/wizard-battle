'use client';

import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { Button } from '../shared/Button';
import {
  MARKET_CATEGORY_OPTIONS,
  MARKET_BUY_SORT_OPTIONS,
} from '@/lib/constants/market';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';

export interface BuyItemsFilters {
  search: string;
  sortBy: string;
  category: string;
}

interface BuyItemsFilterPanelProps {
  filters: BuyItemsFilters;
  onFiltersChange: (filters: BuyItemsFilters) => void;
  onTabChange?: (tab: string) => void;
}

export function BuyItemsFilterPanel({
  filters,
  onFiltersChange,
  onTabChange,
}: BuyItemsFilterPanelProps) {
  const { setIsSellItemsModalOpen } = useMiscellaneousSessionStore();

  const update = (patch: Partial<BuyItemsFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="grid w-full grid-cols-4 items-end gap-4">
      <InputWithLabel
        label="Search Item"
        value={filters.search}
        onChange={(search) => update({ search })}
        placeholder="What you like to buy?"
      />
      <SelectWithLabel
        label="Item type"
        options={MARKET_CATEGORY_OPTIONS}
        value={filters.category}
        onChange={(category) => update({ category })}
      />
      <SelectWithLabel
        label="Sort by"
        options={MARKET_BUY_SORT_OPTIONS}
        value={filters.sortBy}
        onChange={(sortBy) => update({ sortBy })}
      />
      <div className="flex flex-col justify-end px-2 pb-1">
        <Button
          variant="blue"
          className="h-14 w-full"
          onClick={() => setIsSellItemsModalOpen(true)}
          enableHoverSound
          enableClickSound
        >
          <span className="font-pixel text-base font-bold text-white">
            Sell my items
          </span>
        </Button>
      </div>
    </div>
  );
}
