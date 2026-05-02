import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ITournamentAsset } from '@/lib/types/ITournament';
import { formatTournamentAtomicAmount } from './tournamentUtils';

interface TournamentAssetDisplayProps {
  asset: ITournamentAsset;
  className?: string;
}

export function TournamentAssetDisplay({
  asset,
  className,
}: TournamentAssetDisplayProps) {
  if (asset.type === 'currency') {
    if (asset.currency === 'mina') {
      return (
        <span
          className={cn(
            'font-pixel-klein text-sm font-bold tabular-nums',
            className
          )}
        >
          {formatTournamentAtomicAmount(asset.amount)} MINA
        </span>
      );
    }

    const icon =
      asset.currency === 'gold'
        ? '/icons/gold-coin.png'
        : '/icons/usdс-coin.png';
    return (
      <span
        className={cn(
          'font-pixel-klein flex items-center gap-1 text-sm font-bold',
          className
        )}
      >
        <Image
          src={icon}
          width={14}
          height={14}
          alt={asset.currency}
          unoptimized
          className="h-3.5 w-3.5 object-contain"
        />
        {asset.currency === 'usdc'
          ? formatTournamentAtomicAmount(asset.amount)
          : asset.amount.toLocaleString('en-US')}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'font-pixel-klein text-main-gray text-sm font-bold',
        className
      )}
    >
      {asset.itemId} ×{asset.quantity}
    </span>
  );
}
