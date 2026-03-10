'use client';

import { TournamentsDetailsLeaderboardBg } from './assets/tournaments-details-leaderboard-bg';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsLeaderboardProps {
  tournament: ITournament;
}

// TODO: replace with real leaderboard data from store
const MOCK_ENTRIES: { rank: number; address: string; score: number }[] = [];

export function TournamentDetailsLeaderboard({
  tournament,
}: TournamentDetailsLeaderboardProps) {
  return (
    <div className="relative flex h-full flex-1 flex-col">
      <TournamentsDetailsLeaderboardBg className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex h-full flex-col gap-3 p-5">
        {/* Header */}
        <span className="font-pixel text-main-gray text-base font-bold">
          Leaderboard
        </span>

        {/* Table header */}
        <div className="font-pixel-klein text-main-gray/60 grid grid-cols-[2rem_1fr_5rem] gap-2 border-b border-main-gray/20 pb-2 text-xs">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Score</span>
        </div>

        {/* Rows */}
        {MOCK_ENTRIES.length === 0 ? (
          <div className="font-pixel text-main-gray/40 flex flex-1 items-center justify-center text-sm">
            No participants yet
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {MOCK_ENTRIES.map((entry) => (
              <div
                key={entry.rank}
                className="font-pixel-klein text-main-gray grid grid-cols-[2rem_1fr_5rem] gap-2 py-1 text-xs"
              >
                <span className="font-bold">{entry.rank}</span>
                <span className="truncate">{entry.address}</span>
                <span className="text-right font-bold">{entry.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
