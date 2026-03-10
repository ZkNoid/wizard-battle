'use client';

import Image from 'next/image';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { TournamentActionButton } from './TournamentActionButton';
import { formatDateRange } from './tournamentUtils';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsFormProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
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

export function TournamentDetailsForm({
  tournament,
  onJoin,
  onClaim,
}: TournamentDetailsFormProps) {
  return (
    <div className="flex h-full w-full flex-row gap-6">
      {/* Left — image + action */}
      <div className="flex w-56 shrink-0 flex-col gap-4">
        <div className="flex items-center justify-center">
          <Image
            src={tournament.imageURL}
            width={160}
            height={160}
            alt={tournament.title}
            unoptimized
            className="h-40 w-40 object-contain object-center"
          />
        </div>
        <TournamentActionButton
          tournament={tournament}
          onJoin={onJoin}
          onClaim={onClaim}
        />
      </div>

      {/* Right — details */}
      <div className="font-pixel text-main-gray flex flex-1 flex-col gap-3">
        {/* Status */}
        <span className={`font-pixel-klein text-xs font-bold ${STATUS_COLOR[tournament.status]}`}>
          {STATUS_LABEL[tournament.status]}
        </span>

        {/* Dates */}
        <div className="flex flex-col gap-0.5">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Dates</span>
          <span className="text-sm">
            {formatDateRange(tournament.dateFrom, tournament.dateTo)}
          </span>
        </div>

        {/* Max participants */}
        <div className="flex flex-col gap-0.5">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Slots</span>
          <span className="text-sm">{tournament.maxParticipants}</span>
        </div>

        {/* Ticket cost */}
        <div className="flex flex-col gap-0.5">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Entry fee</span>
          {tournament.ticketCost ? (
            <TournamentAssetDisplay
              asset={tournament.ticketCost}
              className="text-main-gray"
            />
          ) : (
            <span className="font-pixel-klein text-sm font-bold text-green-400">
              Free
            </span>
          )}
        </div>

        {/* Prize pool */}
        <div className="flex flex-col gap-1">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Prize pool</span>
          <div className="flex flex-col gap-1">
            {tournament.prizePool.map((asset, i) => (
              <TournamentAssetDisplay
                key={i}
                asset={asset}
                className="text-main-gray"
              />
            ))}
          </div>
        </div>

        {/* Sponsors */}
        {tournament.sponsors.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-pixel-klein text-main-gray/60 text-xs">Sponsors</span>
            <div className="flex flex-row flex-wrap gap-x-3 gap-y-1">
              {tournament.sponsors.map((sponsor, i) => (
                <span key={i}>
                  {sponsor.url ? (
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel-klein text-sm underline-offset-2 hover:underline"
                    >
                      {sponsor.name}
                    </a>
                  ) : (
                    <span className="font-pixel-klein text-sm">{sponsor.name}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
