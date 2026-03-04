'use client';

import { useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  BuyItemsFilterPanel,
  type BuyItemsFilters,
} from './BuyItemsFilterPanel';

interface BuyItemsFormProps {
  onClose?: () => void;
  onTabChange?: (tab: string) => void;
}

const DEFAULT_FILTERS: BuyItemsFilters = {
  search: '',
  sortBy: 'new_to_old',
  category: 'all',
};

export function BuyItemsForm({ onClose, onTabChange }: BuyItemsFormProps) {
  const [filters, setFilters] = useState<BuyItemsFilters>(DEFAULT_FILTERS);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="P2P Market" onClose={onClose ?? (() => {})} />

      <BuyItemsFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onTabChange={onTabChange}
      />

      {/* TODO: render filtered items list using `filters` */}
      <span>Items...</span>
    </div>
  );
}
