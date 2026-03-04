import Image from 'next/image';
import type { IMarketSellingItem } from '@/lib/types/IMarket';
import { HistoryItemBg } from './assets/history-item-bg';
import { Button } from '../shared/Button';

export const SELLING_GRID_COLS =
  'grid-cols-[minmax(0,3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.5fr)]';

interface SellingListItemProps {
  item: IMarketSellingItem;
  onCancel?: (id: string) => void;
}

function formatTimeOnMarket(listedAt: string): string {
  const diffMs = Date.now() - new Date(listedAt).getTime();
  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${totalDays}d ${hours}h ${minutes}m`;
    return `${totalDays}d ${totalMinutes % (24 * 60)}m`;
  }
  if (totalHours > 0) {
    const minutes = totalMinutes % 60;
    return `${totalHours}h ${minutes}m`;
  }
  return `${totalMinutes}m`;
}

export function SellingListItem({ item, onCancel }: SellingListItemProps) {
  const isOnSale = item.status === 'on_sale';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative grid h-14 flex-1 items-center gap-3 px-4 ${SELLING_GRID_COLS}`}
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
            {item.quantity}
          </span>
        </div>

        {/* Time on market */}
        <div className="relative z-10">
          <span className="font-pixel text-main-gray text-xs">
            {formatTimeOnMarket(item.listedAt)}
          </span>
        </div>

        {/* Status */}
        <div className="relative z-10 flex items-center">
          <span
            className={`font-pixel text-xs font-bold ${
              isOnSale ? 'text-green-600' : 'text-red-500'
            }`}
          >
            {isOnSale ? 'On sale' : 'Sold'}
          </span>
        </div>
      </div>

      {/* Cancel button — visible only for on_sale items, keeps space when sold */}
      <div className="w-30 flex-shrink-0">
        {isOnSale && (
          <Button
            variant="red"
            className="h-12 w-full"
            onClick={() => onCancel?.(item.id)}
            enableHoverSound
            enableClickSound
          >
            <span className="font-pixel text-sm font-bold text-white">
              Cancel
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
