'use client';

import { useMemo, useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  BuyItemsFilterPanel,
  type BuyItemsFilters,
} from './BuyItemsFilterPanel';
import { BuyItemsList } from './BuyItemsList';
import { BuyConfirmModal } from './BuyConfirmModal';
import { MARKET_BUY_ITEMS } from '@/lib/constants/market';
import type { IMarketBuyItem } from '@/lib/types/IMarket';

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
  const [selectedItem, setSelectedItem] = useState<IMarketBuyItem | null>(null);

  const handleBuyConfirm = (item: IMarketBuyItem, quantity: number) => {
    console.log('Buying', quantity, 'x', item.title);
    setSelectedItem(null);
  };

  const filteredItems = useMemo<IMarketBuyItem[]>(() => {
    let items = [...MARKET_BUY_ITEMS];

    if (filters.category !== 'all') {
      items = items.filter((item) => item.type === filters.category);
    }

    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
    }

    switch (filters.sortBy) {
      case 'new_to_old':
        break;
      case 'old_to_new':
        items = items.reverse();
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
      <ModalTitle title="P2P Market" onClose={onClose ?? (() => {})} />

      <BuyItemsFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onTabChange={onTabChange}
      />

      <BuyItemsList items={filteredItems} onItemClick={setSelectedItem} />

      {selectedItem && (
        <BuyConfirmModal
          item={selectedItem}
          onConfirm={handleBuyConfirm}
          onCancel={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
