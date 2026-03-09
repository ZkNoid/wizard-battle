'use client';

import Image from 'next/image';
import { Button } from '../shared/Button';
import { TournamentListItemBg } from './assets/tournament-list-item-bg';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';

interface TournamentsListItemProps {
  tournament: ITournament;
  onClick?: (tournament: ITournament) => void;
}

const STATUS_LABEL: Record<ITournament['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  ended: 'Ended',
};

const STATUS_COLOR: Record<ITournament['status'], string> = {
  upcoming: 'text-yellow-400',
  active: 'text-green-400',
  ended: 'text-main-gray/50',
};

const USER_STATUS_BUTTON: Record<ITournament['userStatus'], string> = {
  'not-joined': 'Join',
  'got-ticket': 'Enter',
  joined: 'View',
  won: 'Results',
  lost: 'Results',
  pending: 'Results',
};

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
  const isDisabled = tournament.status === 'ended';

  return (
    <div className="font-pixel text-main-gray relative flex w-full flex-row items-center justify-between gap-6 px-6 py-5">
      <TournamentListItemBg className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Title + dates */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-bold">{tournament.title}</span>
        <span className="font-pixel-klein text-main-gray/60 text-xs">
          {tournament.dateFrom} — {tournament.dateTo}
        </span>
      </div>

      {/* Prize pool */}
      <div className="relative z-10 flex flex-col items-start gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">
          Prize pool
        </span>
        <div className="flex flex-col gap-0.5">
          {tournament.prizePool.map((asset, i) => (
            <AssetDisplay key={i} asset={asset} />
          ))}
        </div>
      </div>

      {/* Ticket cost */}
      <div className="relative z-10 flex flex-col items-start gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">
          Entry fee
        </span>
        {tournament.ticketCost ? (
          <AssetDisplay asset={tournament.ticketCost} />
        ) : (
          <span className="font-pixel-klein text-sm font-bold text-green-400">
            Free
          </span>
        )}
      </div>

      {/* Max participants */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">
          Slots
        </span>
        <span className="font-pixel-klein text-sm font-bold">
          {tournament.maxParticipants}
        </span>
      </div>

      {/* Status */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">
          Status
        </span>
        <span
          className={`font-pixel-klein text-sm font-bold ${STATUS_COLOR[tournament.status]}`}
        >
          {STATUS_LABEL[tournament.status]}
        </span>
      </div>

      {/* Action button */}
      <Button
        variant="gray"
        className="relative z-10 h-10 w-28 shrink-0"
        onClick={() => onClick?.(tournament)}
        disabled={isDisabled}
        enableHoverSound
        enableClickSound
      >
        <span className="font-pixel-klein text-base font-bold">
          {USER_STATUS_BUTTON[tournament.userStatus]}
        </span>
      </Button>
    </div>
  );
}
