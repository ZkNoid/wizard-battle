'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { TournamentDetailsDataBg } from './assets/tournament-details-data-bg';
import { TournamentDetailsImgBg } from './assets/tournament-details-img-bg';
import { TournamentDetailsTimerBg } from './assets/tournament-details-timer-bg';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { TournamentActionButton } from './TournamentActionButton';
import { formatDateRange } from './tournamentUtils';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsInfoProps {
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

function getTargetDate(tournament: ITournament): Date | null {
  if (tournament.status === 'ended') return null;
  const dateStr =
    tournament.status === 'upcoming' ? tournament.dateFrom : tournament.dateTo;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function useCountdown(targetDate: Date | null): string {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!targetDate) {
      setDisplay('Ended');
      return;
    }

    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      setDisplay(formatCountdown(diff));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return display;
}

export function TournamentDetailsInfo({
  tournament,
  onJoin,
  onClaim,
}: TournamentDetailsInfoProps) {
  const targetDate = getTargetDate(tournament);
  const countdown = useCountdown(targetDate);

  return (
    <div className="relative flex h-full flex-col">
      <TournamentDetailsDataBg className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex h-full flex-col gap-3 p-4">
        {/* Tournament image */}
        <div className="relative flex items-center justify-center">
          <TournamentDetailsImgBg className="absolute inset-0 h-full w-full" />
          <Image
            src={tournament.imageURL}
            width={120}
            height={120}
            alt={tournament.title}
            unoptimized
            className="relative z-10 h-28 w-28 object-contain object-center py-2"
          />
        </div>

        {/* Timer */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-pixel-klein text-main-gray/60 text-xs">
            {tournament.status === 'upcoming' ? 'Starts in' : tournament.status === 'active' ? 'Ends in' : 'Status'}
          </span>
          <div className="relative flex items-center justify-center px-3 py-1">
            <TournamentDetailsTimerBg className="absolute inset-0 h-full w-full" />
            <span className="font-pixel relative z-10 text-main-gray text-xs font-bold">
              {countdown}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Status</span>
          <span className={`font-pixel-klein text-xs font-bold ${STATUS_COLOR[tournament.status]}`}>
            {STATUS_LABEL[tournament.status]}
          </span>
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-0.5">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Dates</span>
          <span className="font-pixel text-main-gray text-xs">
            {formatDateRange(tournament.dateFrom, tournament.dateTo)}
          </span>
        </div>

        {/* Slots */}
        <div className="flex items-center justify-between">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Slots</span>
          <span className="font-pixel text-main-gray text-xs font-bold">
            {tournament.maxParticipants}
          </span>
        </div>

        {/* Entry fee */}
        <div className="flex items-center justify-between">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Entry fee</span>
          {tournament.ticketCost ? (
            <TournamentAssetDisplay asset={tournament.ticketCost} className="text-main-gray" />
          ) : (
            <span className="font-pixel-klein text-xs font-bold text-green-400">Free</span>
          )}
        </div>

        {/* Prize pool */}
        <div className="flex flex-col gap-1">
          <span className="font-pixel-klein text-main-gray/60 text-xs">Prize pool</span>
          <div className="flex flex-col gap-0.5">
            {tournament.prizePool.map((asset, i) => (
              <TournamentAssetDisplay key={i} asset={asset} className="text-main-gray" />
            ))}
          </div>
        </div>

        {/* Sponsors */}
        {tournament.sponsors.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="font-pixel-klein text-main-gray/60 text-xs">Sponsors</span>
            <div className="flex flex-row flex-wrap gap-x-2 gap-y-1">
              {tournament.sponsors.map((sponsor, i) => (
                <span key={i}>
                  {sponsor.url ? (
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-pixel-klein text-main-gray text-xs underline-offset-2 hover:underline"
                    >
                      {sponsor.name}
                    </a>
                  ) : (
                    <span className="font-pixel-klein text-main-gray text-xs">{sponsor.name}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-auto pt-2">
          <TournamentActionButton tournament={tournament} onJoin={onJoin} onClaim={onClaim} />
        </div>
      </div>
    </div>
  );
}
