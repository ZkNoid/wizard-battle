'use client';

import { Scroll } from '../shared/Scroll';
import { TournamentsListItem } from './TournamentsListItem';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentsListProps {
  tournaments: ITournament[];
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
  onOpen?: (tournament: ITournament) => void;
  onViewDetails?: (tournament: ITournament) => void;
}

export function TournamentsList({
  tournaments,
  onJoin,
  onClaim,
  onOpen,
  onViewDetails,
}: TournamentsListProps) {
  return (
    <div className="h-140">
      <Scroll alwaysShowScrollbar className="h-100" height="100%">
        {tournaments.length === 0 ? (
          <div className="font-pixel text-main-gray/60 flex h-40 items-center justify-center text-base">
            No tournaments available
          </div>
        ) : (
          <div className="flex flex-col gap-2 pr-1">
            {tournaments.map((tournament) => (
              <TournamentsListItem
                key={tournament.id}
                tournament={tournament}
                onJoin={onJoin}
                onClaim={onClaim}
                onOpen={onOpen}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </Scroll>
    </div>
  );
}
