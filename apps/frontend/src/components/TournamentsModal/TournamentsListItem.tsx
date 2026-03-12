'use client';

import Image from 'next/image';
import { TournamentListItemBg } from './assets/tournament-list-item-bg';
import { TournamentListItemImageBg } from './assets/tournament-list-item-image-bg';
import { TournamentActionButton } from './TournamentActionButton';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { formatDateRange } from './tournamentUtils';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentsListItemProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
  onOpen?: (tournament: ITournament) => void;
  onViewDetails?: (tournament: ITournament) => void;
}

export function TournamentsListItem({
  tournament,
  onJoin,
  onClaim,
  onOpen,
  onViewDetails,
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
        {/* Title */}
        <span className="truncate text-base font-bold">{tournament.title}</span>

        {/* Dates */}
        <span className="">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Dates:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray text-xs">
            {formatDateRange(tournament.dateFrom, tournament.dateTo)}
          </span>
        </span>

        {/* Prize pool */}
        <div className="flex flex-row items-center gap-2">
          <span className="font-pixel-klein text-main-gray/60 text-md">
            Prize:
          </span>
          &nbsp;
          <span className="font-pixel text-main-gray flex flex-row items-center gap-4 text-xs">
            {tournament.prizePool.map((asset, i) => (
              <TournamentAssetDisplay key={i} asset={asset} />
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
              <TournamentAssetDisplay asset={tournament.ticketCost} />
            ) : (
              <span className="font-pixel-klein text-main-gray text-sm font-bold">
                Free
              </span>
            )}
          </span>
        </div>

        {/* Sponsors */}
        {tournament.sponsors.length > 0 && (
          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-pixel-klein text-main-gray/60 text-md">
              Sponsors:
            </span>
            {tournament.sponsors.map((sponsor, i) => (
              <span key={i}>
                {sponsor.url ? (
                  <a
                    href={sponsor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-pixel text-main-gray text-xs underline-offset-2 hover:underline"
                  >
                    {sponsor.name}
                  </a>
                ) : (
                  <span className="font-pixel text-main-gray text-xs">
                    {sponsor.name}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Col 3 — action button */}
      <div className="relative z-10 flex w-1/4 shrink-0 flex-col items-center justify-between self-stretch px-4 py-4">
        <div className="h-15 w-full">
          <TournamentActionButton
            tournament={tournament}
            onJoin={onJoin}
            onClaim={onClaim}
            onOpen={onOpen}
          />
        </div>

        <span
          className="font-pixel text-main-gray cursor-pointer text-xs underline-offset-2 hover:underline"
          onClick={() => onViewDetails?.(tournament)}
        >
          View tournament details
        </span>
      </div>
    </div>
  );
}
