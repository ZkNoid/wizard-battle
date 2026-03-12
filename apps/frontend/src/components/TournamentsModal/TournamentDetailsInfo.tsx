'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '../shared/Button';
import { TournamentDetailsDataBg } from './assets/tournament-details-data-bg';
import { TournamentDetailsImgBg } from './assets/tournament-details-img-bg';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { TournamentActionButton } from './TournamentActionButton';
import { formatDateRange } from './tournamentUtils';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsInfoProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
  onOpen?: (tournament: ITournament) => void;
}

function getTargetDate(tournament: ITournament): Date | null {
  if (tournament.status === 'ended') return null;
  const dateStr =
    tournament.status === 'upcoming' ? tournament.dateFrom : tournament.dateTo;
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-pixel text-main-gray text-sm font-bold">
      {children}
    </span>
  );
}

export function TournamentDetailsInfo({
  tournament,
  onJoin,
  onClaim,
  onOpen,
}: TournamentDetailsInfoProps) {
  const targetDate = getTargetDate(tournament);
  const countdown = useCountdown(targetDate);
  const timerLabel =
    tournament.status === 'upcoming'
      ? 'Starts in'
      : tournament.status === 'active'
        ? 'Ends in'
        : 'Event ended';

  return (
    <div className="relative flex h-full flex-col p-4">
      <TournamentDetailsDataBg className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex h-full flex-col gap-4 p-5">
        {/* Tournament name */}
        <span className="font-pixel text-main-gray text-md text-center font-bold leading-tight">
          {tournament.title}
        </span>

        {/* Image */}
        <div className="relative flex h-40 w-full items-center justify-center py-1">
          <TournamentDetailsImgBg className="absolute inset-0 h-full w-full" />
          <Image
            src={tournament.imageURL}
            width={120}
            height={120}
            alt={tournament.title}
            unoptimized
            className="relative z-10 h-full w-full object-contain object-center p-2"
          />
        </div>

        {/* Timer + action button row */}
        <div className="flex items-stretch gap-4">
          {/* Timer */}
          <Button variant="lightGray" className="h-15 flex-1 gap-2" disabled>
            <Image
              src="/icons/timer.png"
              width={20}
              height={20}
              alt="timer"
              unoptimized
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="font-pixel text-main-gray text-md font-bold leading-tight">
              {countdown}
            </span>
          </Button>
          {/* Action button */}
          <div className="h-15 w-50">
            <TournamentActionButton
              tournament={tournament}
              onJoin={onJoin}
              onClaim={onClaim}
              onOpen={onOpen}
            />
          </div>
        </div>

        {/* Main information */}
        <div className="flex flex-col gap-2">
          <SectionTitle>Main information</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {/* Dates */}
            <div className="flex items-start gap-2">
              <span className="font-pixel-klein text-main-gray/60 text-xs">
                Dates:
              </span>
              <span className="font-pixel-klein text-main-gray text-right text-xs">
                {formatDateRange(tournament.dateFrom, tournament.dateTo)}
              </span>
            </div>
            {/* Prize pool */}
            <div className="flex items-start gap-2">
              <span className="font-pixel-klein text-main-gray/60 shrink-0 text-xs">
                Prize:
              </span>
              <div className="flex flex-row gap-2">
                {tournament.prizePool.map((asset, i) => (
                  <TournamentAssetDisplay
                    key={i}
                    asset={asset}
                    className="text-main-gray"
                  />
                ))}
              </div>
            </div>
            {/* Ticket cost */}
            <div className="flex items-center gap-2">
              <span className="font-pixel-klein text-main-gray/60 text-xs">
                Ticket cost:
              </span>
              {tournament.ticketCost ? (
                <TournamentAssetDisplay
                  asset={tournament.ticketCost}
                  className="text-main-gray"
                />
              ) : (
                <span className="font-pixel-klein text-main-gray text-xs font-bold">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <div className="flex flex-col gap-1">
            <SectionTitle>Description</SectionTitle>
            <p className="font-pixel-klein text-main-gray/80 text-xs leading-relaxed">
              {tournament.description}
            </p>
          </div>
        )}

        {/* Additional information */}
        <div className="flex flex-col gap-2">
          <SectionTitle>Additional information</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {/* Max participants */}
            <div className="flex items-center gap-2">
              <span className="font-pixel-klein text-main-gray/60 text-xs">
                Players joined:
              </span>
              <span className="font-pixel-klein text-main-gray text-xs font-bold">
                {tournament.maxParticipants}
              </span>
            </div>
            {/* Sponsors */}
            {tournament.sponsors.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="font-pixel-klein text-main-gray/60 shrink-0 text-xs">
                  Sponsors:
                </span>
                <div className="flex flex-row flex-wrap justify-end gap-x-2 gap-y-1">
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
                        <span className="font-pixel-klein text-main-gray text-xs">
                          {sponsor.name}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
