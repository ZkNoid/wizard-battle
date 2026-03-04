import Image from 'next/image';
import type { IMarketHistoryItem } from '@/lib/types/IMarket';
import { HistoryItemBg } from './assets/history-item-bg';

const GRID_COLS =
  'grid-cols-[minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)]';

interface TradingHistoryListItemProps {
  item: IMarketHistoryItem;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export { GRID_COLS };

export function TradingHistoryListItem({ item }: TradingHistoryListItemProps) {
  const isBought = item.status === 'bought';

  return (
    <div
      className={`relative grid h-14 w-full items-center gap-3 px-4 ${GRID_COLS}`}
    >
      <HistoryItemBg className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Item: image + name */}
      <div className="relative z-10 flex min-w-0 items-center gap-2">
        <Image
          src={`/items/${item.image}`}
          width={32}
          height={32}
          alt={item.title}
          className="h-8 w-8 flex-shrink-0 object-contain object-center"
          unoptimized
        />
        <div className="flex min-w-0 flex-col">
          <span className="font-pixel text-main-gray truncate text-xs font-bold leading-tight">
            {item.title} Lv{item.level}
          </span>
          <span className="font-pixel-klein text-main-gray/60 truncate text-xs leading-tight">
            {item.type
              .replace('gear_', 'Gear: ')
              .replace(/^\w/, (c) => c.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="relative z-10 flex items-center gap-1">
        <Image
          src={
            item.priceCurrency === 'gold'
              ? '/icons/gold-coin.png'
              : '/icons/usdс-coin.png'
          }
          width={14}
          height={14}
          alt={item.priceCurrency}
          className="h-3.5 w-3.5 flex-shrink-0 object-contain"
          unoptimized
        />
        <span className="font-pixel-klein text-main-gray text-sm font-bold">
          {item.price}
        </span>
      </div>

      {/* Quantity */}
      <div className="relative z-10">
        <span className="font-pixel-klein text-main-gray text-sm font-bold">
          ×{item.quantity}
        </span>
      </div>

      {/* Date */}
      <div className="relative z-10 flex flex-col">
        <span className="font-pixel text-main-gray text-xs leading-tight">
          {formatDate(item.date)}
        </span>
      </div>

      {/* Status */}
      <div className="relative z-10 flex items-center">
        <span
          className={`font-pixel text-xs font-bold uppercase ${
            isBought ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Transaction */}
      <div className="relative z-10">
        <span className="font-pixel-klein text-main-gray/50 hover:text-main-gray cursor-pointer text-xs underline underline-offset-2 transition-colors">
          View
        </span>
      </div>
    </div>
  );
}
