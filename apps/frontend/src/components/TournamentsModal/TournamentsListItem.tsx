'use client';

import Image from 'next/image';
import { TournamentListItemBg } from './assets/tournament-list-item-bg';
import { TournamentListItemImageBg } from './assets/tournament-list-item-image-bg';
import { TournamentActionButton } from './TournamentActionButton';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';

interface TournamentsListItemProps {
  tournament: ITournament;
  onClick?: (tournament: ITournament) => void;
}

function AssetDisplay({ asset }: { asset: ITournamentAsset }) {
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

export function TournamentsListItem({
  tournament,
  onClick,
}: TournamentsListItemProps) {
  return (
    <div className="font-pixel text-main-gray relative flex w-full flex-row items-stretch gap-0">
      <TournamentListItemBg className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Col 1 — tournament image */}
      <div className="relative z-10 flex w-1/4 shrink-0 items-center justify-center p-3">
        <div className="relative flex h-full w-full items-center justify-center">
          <TournamentListItemImageBg className="absolute inset-0 h-full w-full" />
          <Image
            src={tournament.imageURL}
            width={96}
            height={96}
            alt={tournament.title}
            unoptimized
            className="relative z-10 h-24 w-24 object-contain object-center"
          />
        </div>
      </div>

      {/* Col 2 — tournament info */}
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-2 py-4 pr-4">
        {/* Title + status */}
        <div className="flex items-center gap-3">
          <span className="truncate text-base font-bold">
            {tournament.title}
          </span>
        </div>

        {/* Dates */}
        <span className="">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Dates:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray text-xs">
            {tournament.dateFrom} — {tournament.dateTo}
          </span>
        </span>

        {/* Prize pool + entry fee + slots */}
        <div className="flex flex-row items-center gap-2">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Prize:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray flex flex-row items-center gap-2 text-xs">
            {tournament.prizePool.map((asset, i) => (
              <AssetDisplay key={i} asset={asset} />
            ))}
          </span>
        </div>

        {/* Ticket cost */}

        <div className="flex flex-row items-center gap-2">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Ticket cost:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray text-xs">
            {tournament.ticketCost ? (
              <AssetDisplay asset={tournament.ticketCost} />
            ) : (
              <span className="font-pixel-klein text-main-gray text-sm font-bold">
                Free
              </span>
            )}
          </span>
        </div>

        {/* Tournament sponsors */}
        <div className="flex flex-row items-center gap-2">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Sponsors:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray text-xs">
            {tournament.sponsors.map((sponsor, i) => (
              <span key={i}>{sponsor.name}</span>
            ))}
          </span>
        </div>
      </div>

      {/* Col 3 — action button */}
      <div className="relative z-10 flex w-1/4 shrink-0 items-center justify-center px-4">
        <TournamentActionButton tournament={tournament} onClick={onClick} />
      </div>
    </div>
  );
}
