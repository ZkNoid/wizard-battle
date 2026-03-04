'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  ItemsSellingFilterPanel,
  type ItemsSellingFilters,
} from './ItemsSellingFilterPanel';
import { SellingList } from './SellingList';
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
  const [items, setItems] = useState(MARKET_SELLING_ITEMS);

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

  const handleCancel = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Items on Market" onClose={onClose ?? (() => {})} />

      <ItemsSellingFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onTabChange={onTabChange}
      />

      <SellingList items={filteredItems} onCancel={handleCancel} />
    </div>
  );
}
