'use client';

import { useState } from 'react';
import ModalTitle from '../shared/ModalTitle';
import {
  TournamentsFilterPanel,
  type TournamentsFilters,
} from './TournamentsFilterPanel';
import { TournamentsList } from './TournamentsList';
import { TournamentDetailsForm } from './TournamentDetailsForm';
import { BuyTicketConfirmationModal } from './BuyTicketConfirmationModal';
import { CongratulationsModal } from './CongratulationsModal';
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
  const [selectedTournament, setSelectedTournament] =
    useState<ITournament | null>(null);
  const [joinTournament, setJoinTournament] = useState<ITournament | null>(
    null
  );
  const [claimTournament, setClaimTournament] = useState<ITournament | null>(
    null
  );

  const tournaments = sortTournaments(ALL_TOURNAMENTS, filters.sortBy);

  const handleConfirmJoin = (tournament: ITournament) => {
    // TODO: trigger buy ticket transaction and show result modal
    setJoinTournament(null);
  };

  const handleConfirmClaim = () => {
    // TODO: trigger claim rewards transaction
    setClaimTournament(null);
  };

  const modalTitle = selectedTournament ? 'Tournament Details' : 'Tournaments';

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title={modalTitle} onClose={onClose ?? (() => {})} />

      {selectedTournament ? (
        <TournamentDetailsForm
          tournament={selectedTournament}
          onBack={() => setSelectedTournament(null)}
          onJoin={setJoinTournament}
          onClaim={setClaimTournament}
        />
      ) : (
        <>
          <TournamentsFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
          />

          <TournamentsList
            tournaments={tournaments}
            onJoin={setJoinTournament}
            onClaim={setClaimTournament}
            onViewDetails={setSelectedTournament}
          />
        </>
      )}

      {joinTournament && (
        <BuyTicketConfirmationModal
          tournament={joinTournament}
          onConfirm={handleConfirmJoin}
          onBack={() => setJoinTournament(null)}
        />
      )}

      {claimTournament && (
        <CongratulationsModal
          rewards={claimTournament.prizePool}
          onClaim={handleConfirmClaim}
          onClose={() => setClaimTournament(null)}
        />
      )}
    </div>
  );
}
