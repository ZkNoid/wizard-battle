'use client';

import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';
import { Button } from '../shared/Button';

export const SORT_OPTIONS = [
  { value: 'new_to_old', label: 'From new to old' },
  { value: 'old_to_new', label: 'From old to new' },
  { value: 'price_high', label: 'Price: From high to low' },
  { value: 'price_low', label: 'Price: From low to high' },
  { value: 'only_gold', label: 'Only for gold' },
  { value: 'only_usdc', label: 'Only for USDC' },
];

export const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'crafting', label: 'Crafting Items' },
  { value: 'crystals', label: 'Crystals' },
  { value: 'gear_archer', label: 'Gear: Archer' },
  { value: 'gear_duelist', label: 'Gear: Duelist' },
  { value: 'gear_sorcerer', label: 'Gear: Sorcerer' },
];

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
        options={CATEGORY_OPTIONS}
        value={filters.category}
        onChange={(category) => update({ category })}
      />
      <SelectWithLabel
        label="Sort by"
        options={SORT_OPTIONS}
        value={filters.sortBy}
        onChange={(sortBy) => update({ sortBy })}
      />
      <div className="flex flex-col justify-end px-2 pb-1">
        <Button
          variant="blue"
          className="h-14 w-full"
          onClick={() => onTabChange?.('selling')}
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
