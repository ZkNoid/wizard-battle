import { useState } from 'react';
import { BuyItemsListItem } from './BuyItemsListItem';
import { Button } from '../shared/Button';
import type { IMarketBuyItem } from '@/lib/types/IMarket';

const COLS = 4;
const ROWS = 3;
const PAGE_SIZE = COLS * ROWS;

interface BuyItemsListProps {
  items: IMarketBuyItem[];
  onItemClick?: (item: IMarketBuyItem) => void;
}

export function BuyItemsList({ items, onItemClick }: BuyItemsListProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Fill remaining slots with nulls so the grid stays uniform
  const slots: (IMarketBuyItem | null)[] = [
    ...pageItems,
    ...Array(PAGE_SIZE - pageItems.length).fill(null),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Grid */}
      <div className="grid grid-cols-4 grid-rows-3 gap-3">
        {slots.map((item, idx) => (
          <div key={item?.id ?? `empty-${idx}`} className="flex items-center justify-center">
            {item ? (
              <BuyItemsListItem item={item} onClick={onItemClick} />
            ) : (
              <div className="h-full w-full opacity-20" />
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="lightGray"
            className="h-9 w-9"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            enableClickSound
          >
            <span className="font-pixel-klein text-main-gray text-sm">{'<'}</span>
          </Button>

          <span className="font-pixel-klein text-main-gray text-sm">
            {safePage + 1} / {totalPages}
          </span>

          <Button
            variant="lightGray"
            className="h-9 w-9"
            disabled={safePage === totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            enableClickSound
          >
            <span className="font-pixel-klein text-main-gray text-sm">{'>'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
