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
  sortBy: 'all',
};

function getPrizeScore(prizePool: ITournamentAsset[]): number {
  return prizePool.reduce((sum, asset) => {
    if (asset.type === 'currency') return sum + asset.amount;
    return sum;
  }, 0);
}

function isWithinHours(dateStr: string, hours: number): boolean {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return target >= now && target <= now + hours * 60 * 60 * 1000;
}

function filterAndSortTournaments(
  tournaments: ITournament[],
  sortBy: string
): ITournament[] {
  switch (sortBy) {
    case 'end_24h':
      return tournaments.filter(
        (t) => t.status === 'active' && isWithinHours(t.dateTo, 24)
      );
    case 'end_week':
      return tournaments.filter(
        (t) => t.status === 'active' && isWithinHours(t.dateTo, 24 * 7)
      );
    case 'start_24h':
      return tournaments.filter(
        (t) => t.status === 'upcoming' && isWithinHours(t.dateFrom, 24)
      );
    case 'start_week':
      return tournaments.filter(
        (t) => t.status === 'upcoming' && isWithinHours(t.dateFrom, 24 * 7)
      );
    case 'prize_high':
      return [...tournaments].sort(
        (a, b) => getPrizeScore(b.prizePool) - getPrizeScore(a.prizePool)
      );
    case 'prize_low':
      return [...tournaments].sort(
        (a, b) => getPrizeScore(a.prizePool) - getPrizeScore(b.prizePool)
      );
    case 'only_usdc':
      return tournaments.filter((t) =>
        t.prizePool.some((a) => a.type === 'currency' && a.currency === 'usdc')
      );
    case 'all':
    default:
      return tournaments;
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

  const tournaments = filterAndSortTournaments(ALL_TOURNAMENTS, filters.sortBy);

  const handleConfirmJoin = (tournament: ITournament) => {
    // TODO: trigger buy ticket transaction and show result modal
    setJoinTournament(null);
  };

  const handleConfirmClaim = () => {
    // TODO: trigger claim rewards transaction
    setClaimTournament(null);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle
        title={selectedTournament ? 'Tournament Details' : 'Tournaments'}
        onClose={onClose ?? (() => {})}
        onBack={
          selectedTournament ? () => setSelectedTournament(null) : undefined
        }
      />

      {selectedTournament ? (
        <TournamentDetailsForm
          tournament={selectedTournament}
          onJoin={setJoinTournament}
          onClaim={setClaimTournament}
          onOpen={setSelectedTournament}
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
            onOpen={setSelectedTournament}
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
