'use client';

import { useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  TournamentsFilterPanel,
  type TournamentsFilters,
} from './TournamentsFilterPanel';
import { TournamentsList } from './TournamentsList';
import type { ITournament } from './TournamentsListItem';

interface TournamentsFormProps {
  onClose?: () => void;
}

const DEFAULT_FILTERS: TournamentsFilters = {
  sortBy: 'new_to_old',
};

export function TournamentsForm({ onClose }: TournamentsFormProps) {
  const [filters, setFilters] = useState<TournamentsFilters>(DEFAULT_FILTERS);

  const tournaments: ITournament[] = [];

  const sortedTournaments = [...tournaments].sort((a, b) => {
    switch (filters.sortBy) {
      case 'old_to_new':
        return a.startDate.localeCompare(b.startDate);
      case 'prize_high':
        return b.prizePool - a.prizePool;
      case 'prize_low':
        return a.prizePool - b.prizePool;
      case 'new_to_old':
      default:
        return b.startDate.localeCompare(a.startDate);
    }
  });

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Tournaments" onClose={onClose ?? (() => {})} />

      <TournamentsFilterPanel filters={filters} onFiltersChange={setFilters} />

      <TournamentsList tournaments={sortedTournaments} />
    </div>
  );
}
