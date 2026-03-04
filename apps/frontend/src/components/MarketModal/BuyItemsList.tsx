import { useState } from 'react';
import Image from 'next/image';
import { BuyItemsListItem } from './BuyItemsListItem';
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
  const pageItems = items.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  // Fill remaining slots with nulls so the grid stays uniform
  const slots: (IMarketBuyItem | null)[] = [
    ...pageItems,
    ...Array(PAGE_SIZE - pageItems.length).fill(null),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Grid wrapper — fixed height to prevent layout jumps */}
      <div className="h-130 flex items-start">
        <div className="grid w-full grid-cols-4 grid-rows-3 gap-3">
          {slots.map((item, idx) => (
            <div
              key={item?.id ?? `empty-${idx}`}
              className="flex items-center justify-center"
            >
              {item ? (
                <BuyItemsListItem item={item} onClick={onItemClick} />
              ) : (
                <div className="h-full w-full opacity-20" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination — always visible to prevent layout jumps */}
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
          className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Image
            src="/inventory/arrow-left.png"
            width={36}
            height={48}
            alt="previous-page"
            className="h-12 w-16 object-contain object-center"
          />
        </button>

        <span className="font-pixel text-main-gray text-xl font-bold">
          {safePage + 1} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage === totalPages - 1}
          className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Image
            src="/inventory/arrow-right.png"
            width={36}
            height={48}
            alt="next-page"
            className="h-12 w-16 object-contain object-center"
          />
        </button>
      </div>
    </div>
  );
}
