import Image from 'next/image';
import type { ITournamentAsset } from '@/lib/types/ITournament';

interface TournamentAssetDisplayProps {
  asset: ITournamentAsset;
}

export function TournamentAssetDisplay({ asset }: TournamentAssetDisplayProps) {
  if (asset.type === 'currency') {
    const icon =
      asset.currency === 'gold'
        ? '/icons/gold-coin.png'
        : '/icons/usdс-coin.png';
    return (
      <span className="font-pixel-klein flex items-center gap-1 text-sm font-bold">
        <Image
          src={icon}
          width={14}
          height={14}
          alt={asset.currency}
          unoptimized
          className="h-3.5 w-3.5 object-contain"
        />
        {asset.amount.toLocaleString()}
      </span>
    );
  }

  return (
    <span className="font-pixel-klein text-sm font-bold">
      {asset.itemId} ×{asset.quantity}
    </span>
  );
}
