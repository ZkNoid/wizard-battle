'use client';

import { useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  TournamentsFilterPanel,
  type TournamentsFilters,
} from './TournamentsFilterPanel';
import { TournamentsList } from './TournamentsList';
import { ALL_TOURNAMENTS } from '@/lib/constants/tournaments';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';

interface TournamentsFormProps {
  onClose?: () => void;
}

const DEFAULT_FILTERS: TournamentsFilters = {
  sortBy: 'new_to_old',
};

function getPrizeScore(prizePool: ITournamentAsset[]): number {
  return prizePool.reduce((sum, asset) => {
    if (asset.type === 'currency') return sum + asset.amount;
    return sum;
  }, 0);
}

function sortTournaments(
  tournaments: ITournament[],
  sortBy: string
): ITournament[] {
  const sorted = [...tournaments];
  switch (sortBy) {
    case 'old_to_new':
      return sorted.sort((a, b) => a.startDate.localeCompare(b.startDate));
    case 'prize_high':
      return sorted.sort(
        (a, b) => getPrizeScore(b.prizePool) - getPrizeScore(a.prizePool)
      );
    case 'prize_low':
      return sorted.sort(
        (a, b) => getPrizeScore(a.prizePool) - getPrizeScore(b.prizePool)
      );
    case 'new_to_old':
    default:
      return sorted.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }
}

export function TournamentsForm({ onClose }: TournamentsFormProps) {
  const [filters, setFilters] = useState<TournamentsFilters>(DEFAULT_FILTERS);

  const tournaments = sortTournaments(ALL_TOURNAMENTS, filters.sortBy);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Tournaments" onClose={onClose ?? (() => {})} />

      <TournamentsFilterPanel filters={filters} onFiltersChange={setFilters} />

      <TournamentsList tournaments={tournaments} />
    </div>
  );
}
