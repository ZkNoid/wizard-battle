import { Scroll } from '../shared/Scroll';
import type { IMarketHistoryItem } from '@/lib/types/IMarket';
import { TradingHistoryListItem, GRID_COLS } from './TradingHistoryListItem';

interface TradingHistoryListProps {
  items: IMarketHistoryItem[];
}

const HEADER_COLS = [
  { label: 'Item', align: 'text-left' },
  { label: 'Price', align: 'text-left' },
  { label: 'Quantity', align: 'text-left' },
  { label: 'Date', align: 'text-left' },
  { label: 'Status', align: 'text-left' },
  { label: 'Transaction', align: 'text-left' },
];

export function TradingHistoryList({ items }: TradingHistoryListProps) {
  return (
    <div className="h-140 flex flex-col gap-2">
      {/* Column headers */}
      <div className={`pr-15 grid w-full gap-3 pl-4 ${GRID_COLS}`}>
        {HEADER_COLS.map(({ label, align }) => (
          <span
            key={label}
            className={`font-pixel text-main-gray text-xs font-bold uppercase tracking-widest ${align}`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Scrollable rows */}
      <div className="min-h-0 flex-1">
        <Scroll height="100%" alwaysShowScrollbar scrollbarGap={6}>
          <div className="flex flex-col gap-2 pr-1">
            {items.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <span className="font-pixel text-main-gray/40 text-sm">
                  No history found
                </span>
              </div>
            ) : (
              items.map((item) => (
                <TradingHistoryListItem key={item.id} item={item} />
              ))
            )}
          </div>
        </Scroll>
      </div>
    </div>
  );
}
